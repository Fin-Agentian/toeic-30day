/**
 * js/views/reading.js — 閱讀診斷室（#/reading）
 *
 * 把「做完題 → 知道哪裡爛 → 知道怎麼補 → 一鍵去練」串成閉環，是閱讀強化的入口頁。
 * 四個分頁：
 *   診斷    Reading 粗估分數、行動建議清單、整份 75 分鐘做不做得完
 *   考點    P5/P6/P7 各考點正確率與平均秒數排行，可直接開專項練習
 *   配速    各 Part 實際 vs 目標配速、官方配速表與考場檢查點
 *   框架    十大文法判斷框架 + Part 7 題型攻略（原創教材）
 *
 * 資料來源：Store.get()（readingStats / quizHistory / wrongBook）+ TOEIC_DATA.reading。
 * 計算全部委託 window.Reading（js/reading.js），本檔只負責畫面。
 * 暴露：window.Views.reading = { render, destroy }
 */
(function () {
  'use strict';

  var TABS = [
    { code: 'diagnosis', label: '診斷', icon: '🩺' },
    { code: 'skills', label: '考點', icon: '🎯' },
    { code: 'pace', label: '配速', icon: '⏱️' },
    { code: 'frameworks', label: '框架', icon: '📐' }
  ];

  var S = null;
  var container = null;
  var changeHandler = null;

  // -----------------------------------------------------------------------
  // 小工具
  // -----------------------------------------------------------------------

  function goTo(hash) {
    if (window.App && typeof window.App.navigate === 'function') window.App.navigate(hash);
    else window.location.hash = hash;
  }

  function clearNode(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  function readingData() {
    return (window.TOEIC_DATA && window.TOEIC_DATA.reading) || null;
  }

  function toneClass(tone) {
    if (tone === 'success') return 'badge-success';
    if (tone === 'warning') return 'badge-warning';
    if (tone === 'danger') return 'badge-danger';
    if (tone === 'primary') return 'badge-primary';
    return '';
  }

  function barClass(pct) {
    if (pct >= 80) return 'progress-bar-fill is-success';
    if (pct >= 55) return 'progress-bar-fill is-warning';
    return 'progress-bar-fill is-danger';
  }

  function statCard(value, label, hint) {
    return Util.h('div.stat-card', {},
      Util.h('div.stat-value', {}, value),
      Util.h('div.stat-label', {}, label),
      hint ? Util.h('div.u-text-muted', { style: { fontSize: '0.75rem', marginTop: '2px' } }, hint) : null
    );
  }

  // -----------------------------------------------------------------------
  // 分頁一：診斷
  // -----------------------------------------------------------------------

  function buildRcCard(d) {
    var rc = d.rc;
    var card = Util.h('div.card', {},
      Util.h('div.card-header', {},
        Util.h('div', {},
          Util.h('div.card-title', {}, '閱讀分數粗估'),
          Util.h('div.card-subtitle', {}, '依你在本站的做題正確率換算，僅供追蹤趨勢，非官方分數')
        )
      )
    );

    if (rc.score === null) {
      card.appendChild(Util.h('div.card-body', {},
        Util.h('p', {}, '還沒有做題紀錄。先做一組 10 題的 Part 5，就能算出第一個基準分數。'),
        Util.h('div.card-actions', {},
          Util.h('button.btn.btn-primary.btn-sm', {
            onClick: function () { goTo('#/quiz?part=P5&count=10'); }
          }, '做 10 題 Part 5')
        )
      ));
      return card;
    }

    var confLabel = { high: '樣本充足', medium: '樣本尚可', low: '樣本偏少，僅供參考' }[rc.confidence] || '';

    card.appendChild(Util.h('div.stat-grid', { style: { marginTop: '12px' } },
      statCard(String(rc.score), '粗估 Reading 分數', '滿分 495'),
      statCard(rc.accuracy + '%', '整體正確率', '共 ' + rc.sample + ' 題'),
      rc.questionsToNext !== null
        ? statCard('+' + rc.questionsToNext + '%', '距 ' + rc.nextScore + ' 分', '正確率再拉高這麼多')
        : statCard('—', '距下一級距', '')
    ));
    card.appendChild(Util.h('p', { style: { marginTop: '12px' } },
      Util.h('span', { class: 'badge ' + (rc.confidence === 'low' ? 'badge-warning' : 'badge-primary') }, confLabel)
    ));

    var proj = d.projection;
    card.appendChild(Util.h('div.card', { style: { marginTop: '14px', background: 'var(--color-surface-alt)' } },
      Util.h('p', { style: { fontWeight: 700, marginBottom: '4px' } }, '整份 Reading 做得完嗎？'),
      Util.h('p', {}, proj.measuredParts === 0
        ? '還沒有計時紀錄。做題時請開啟計時，才能推估考場上的完成度。'
        : (proj.willFinish
          ? ('照目前配速，100 題大約需要 ' + proj.minutes + ' 分鐘，在 75 分鐘的限制內，可以做完。')
          // 超時的分鐘數換算成「來不及作答的題數」：用 Part 7 的每題目標秒數估算，
          // 因為時間不夠時被犧牲的一定是排在最後面的 Part 7。
          : ('照目前配速，100 題大約需要 ' + proj.minutes + ' 分鐘，超過限制 ' + proj.overMinutes +
            ' 分鐘 — 大約會有 ' +
            Math.round(proj.overMinutes * 60 / (Reading.PACE_TARGET.P7 || 60)) +
            ' 題來不及作答。')))
    ));

    return card;
  }

  function buildAdviceCard(d) {
    var card = Util.h('div.card', {},
      Util.h('div.card-title', {}, '接下來該做什麼'),
      Util.h('div.card-subtitle', {}, '依「投入時間 → 分數回收」的順序排列，從上面做起就對了')
    );

    var list = Util.h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' } });
    d.advice.forEach(function (a, i) {
      list.appendChild(Util.h('div.card', { style: { background: 'var(--color-surface-alt)' } },
        Util.h('div.u-flex.u-items-center.u-gap-sm', {},
          Util.h('span', { style: { fontSize: '1.2rem' } }, a.icon),
          Util.h('span.badge.badge-primary', {}, '第 ' + (i + 1) + ' 順位'),
          Util.h('strong', {}, a.title)
        ),
        Util.h('p', { style: { marginTop: '6px' } }, a.detail),
        Util.h('div.u-flex.u-gap-sm', { style: { marginTop: '10px', flexWrap: 'wrap' } },
          Util.h('button.btn.btn-primary.btn-sm', {
            onClick: function () { goTo(a.hash); }
          }, a.actionLabel),
          a.frameworkId ? Util.h('button.btn.btn-ghost.btn-sm', {
            onClick: function () { S.tab = 'frameworks'; S.focusFramework = a.frameworkId; repaint(); }
          }, '先讀框架') : null
        )
      ));
    });
    card.appendChild(list);
    return card;
  }

  function buildReasonCard(d) {
    var r = d.reasons;
    var card = Util.h('div.card', {},
      Util.h('div.card-title', {}, '錯因分佈'),
      Util.h('div.card-subtitle', {}, '在錯題本或做題結果頁標記錯因後，這裡會告訴你「主要是哪一種失分」')
    );

    if (!r.total) {
      card.appendChild(Util.h('p', { style: { marginTop: '12px' } }, '目前沒有閱讀錯題。'));
      return card;
    }

    var tagged = r.total - r.untagged;
    if (!tagged) {
      card.appendChild(Util.h('p', { style: { marginTop: '12px' } },
        '你有 ' + r.total + ' 題閱讀錯題，但都還沒標記錯因。' +
        '花兩分鐘標一標 — 這是整個檢討流程裡最值錢的一步，因為「單字不會」和「時間不夠」要用完全不同的方法補。'));
      card.appendChild(Util.h('div.card-actions', {},
        Util.h('button.btn.btn-primary.btn-sm', { onClick: function () { goTo('#/review'); } }, '去標記錯因')
      ));
      return card;
    }

    var list = Util.h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' } });
    r.rows.filter(function (row) { return row.count > 0; }).forEach(function (row) {
      list.appendChild(Util.h('div', {},
        Util.h('div.u-flex.u-justify-between', {},
          Util.h('span', {}, row.icon + ' ' + row.label),
          Util.h('span.u-text-muted', {}, row.count + ' 題（' + row.share + '%）')
        ),
        Util.h('div.progress-bar', { style: { marginTop: '4px' } },
          Util.h('div.progress-bar-fill', { style: { width: row.share + '%' } })
        ),
        Util.h('p.u-text-muted', { style: { fontSize: '0.82rem', marginTop: '4px' } }, row.advice)
      ));
    });
    card.appendChild(list);

    if (r.untagged) {
      card.appendChild(Util.h('p.u-text-muted', { style: { marginTop: '10px' } },
        '還有 ' + r.untagged + ' 題未標記錯因。'));
    }
    return card;
  }

  function renderDiagnosis(host, d) {
    host.appendChild(buildRcCard(d));
    host.appendChild(buildAdviceCard(d));
    host.appendChild(buildReasonCard(d));
  }

  // -----------------------------------------------------------------------
  // 分頁二：考點
  // -----------------------------------------------------------------------

  function skillRow(r) {
    var fw = Reading.frameworkForTag(r.tag);
    var showFramework = r.part === 'P5' && fw;
    return Util.h('div.card', { style: { background: 'var(--color-surface-alt)' } },
      Util.h('div.u-flex.u-justify-between.u-items-center', { style: { flexWrap: 'wrap', gap: '8px' } },
        Util.h('div.u-flex.u-items-center.u-gap-sm', { style: { flexWrap: 'wrap' } },
          Util.h('strong', {}, r.label),
          Util.h('span', { class: 'badge ' + toneClass(r.level.tone) }, r.level.label)
        ),
        Util.h('span.u-text-muted', {},
          r.correct + '/' + r.total + '　' + r.accuracy + '%' +
          (r.avgSeconds ? ('　平均 ' + r.avgSeconds + 's／目標 ' + r.targetSeconds + 's') : ''))
      ),
      Util.h('div.progress-bar', { style: { marginTop: '6px' } },
        Util.h('div', { class: barClass(r.accuracy), style: { width: r.accuracy + '%' } })
      ),
      r.overPace ? Util.h('p.u-text-muted', { style: { fontSize: '0.82rem', marginTop: '4px' } },
        '⏱️ 這個考點花的時間明顯高於目標，通常代表判斷規則還不夠自動化。') : null,
      Util.h('div.u-flex.u-gap-sm', { style: { marginTop: '10px', flexWrap: 'wrap' } },
        Util.h('button.btn.btn-primary.btn-sm', {
          disabled: !r.poolSize,
          onClick: function () { goTo(Reading.drillHash(r.key, r.part === 'P5' ? 10 : 6)); }
        }, r.poolSize ? ('專練 ' + (r.part === 'P5' ? 10 : 6) + ' 題') : '題庫無此考點'),
        showFramework ? Util.h('button.btn.btn-ghost.btn-sm', {
          onClick: function () { S.tab = 'frameworks'; S.focusFramework = fw.id; repaint(); }
        }, '讀判斷框架') : null
      )
    );
  }

  function renderSkills(host, d) {
    var partFilter = S.skillPart;
    var rows = d.skills.filter(function (r) { return partFilter === 'all' || r.part === partFilter; });

    var chipRow = Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } });
    [['all', '全部'], ['P5', 'Part 5'], ['P6', 'Part 6'], ['P7', 'Part 7']].forEach(function (pair) {
      var count = pair[0] === 'all' ? d.skills.length
        : d.skills.filter(function (r) { return r.part === pair[0]; }).length;
      chipRow.appendChild(Util.h('button', {
        class: 'btn btn-sm ' + (partFilter === pair[0] ? 'btn-primary' : 'btn-ghost'),
        onClick: function () { S.skillPart = pair[0]; repaint(); }
      }, pair[1] + '（' + count + '）'));
    });

    host.appendChild(Util.h('div.card', {},
      Util.h('div.card-title', {}, '考點正確率排行'),
      Util.h('div.card-subtitle', {},
        '弱的排前面。樣本少於 ' + Reading.MIN_SAMPLE + ' 題會標「資料不足」，先多做幾題再看結論。'),
      Util.h('div', { style: { marginTop: '12px' } }, chipRow)
    ));

    if (!rows.length) {
      host.appendChild(Util.h('div.empty-state', {},
        Util.h('div.empty-state-icon', {}, '📊'),
        Util.h('h2', {}, '還沒有考點資料'),
        Util.h('p', {}, '做過閱讀練習後，這裡會依 Part 5 文法考點、Part 6 篇章題型、Part 7 閱讀技巧分別統計正確率。'),
        Util.h('button.btn.btn-primary', { onClick: function () { goTo('#/quiz'); } }, '去做題')
      ));
    } else {
      var list = Util.h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' } });
      rows.forEach(function (r) { list.appendChild(skillRow(r)); });
      host.appendChild(list);
    }

    var untouched = d.untouched.filter(function (u) { return partFilter === 'all' || u.part === partFilter; });
    if (untouched.length) {
      var chips = Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap', marginTop: '10px' } });
      untouched.forEach(function (u) {
        chips.appendChild(Util.h('button.btn.btn-ghost.btn-sm', {
          onClick: function () { goTo(Reading.drillHash(u.key, u.part === 'P5' ? 10 : 6)); }
        }, u.label + '（' + u.poolSize + ' 題）'));
      });
      host.appendChild(Util.h('div.card', {},
        Util.h('div.card-title', {}, '還沒練過的考點'),
        Util.h('div.card-subtitle', {}, '沒有資料就沒有診斷。這些考點各做幾題，弱點地圖才會完整。'),
        chips
      ));
    }
  }

  // -----------------------------------------------------------------------
  // 分頁三：配速
  // -----------------------------------------------------------------------

  function paceRow(p) {
    var toneMap = { slow: 'danger', warn: 'warning', rush: 'warning', ok: 'success', none: '' };
    var ratioPct = p.avgSeconds
      ? Util.clamp(Math.round((p.targetSeconds / p.avgSeconds) * 100), 0, 100)
      : 0;
    return Util.h('div.card', { style: { background: 'var(--color-surface-alt)' } },
      Util.h('div.u-flex.u-justify-between.u-items-center', { style: { flexWrap: 'wrap', gap: '8px' } },
        Util.h('strong', {}, p.label),
        Util.h('span', { class: 'badge ' + toneClass(toneMap[p.verdict]) }, p.verdictText)
      ),
      p.avgSeconds
        ? Util.h('div', {},
          Util.h('p.u-text-muted', { style: { marginTop: '6px' } },
            '實際平均 ' + p.avgSeconds + ' 秒／題 · 目標 ' + p.targetSeconds + ' 秒／題 · ' +
            '共 ' + p.questions + ' 題 · 正確率 ' + p.accuracy + '%'),
          Util.h('div.progress-bar', { style: { marginTop: '6px' } },
            Util.h('div', { class: barClass(ratioPct), style: { width: ratioPct + '%' } })
          )
        )
        : Util.h('p.u-text-muted', { style: { marginTop: '6px' } },
          '還沒有計時紀錄。做題時把「開啟計時」打勾就會開始累積。'),
      Util.h('div.u-flex.u-gap-sm', { style: { marginTop: '10px', flexWrap: 'wrap' } },
        Util.h('button.btn.btn-primary.btn-sm', {
          onClick: function () { goTo('#/quiz?part=' + p.part + '&count=10'); }
        }, '計時練 ' + p.part)
      )
    );
  }

  function renderPace(host, d) {
    var proj = d.projection;
    host.appendChild(Util.h('div.card', {},
      Util.h('div.card-title', {}, '你目前的配速'),
      Util.h('div.card-subtitle', {}, '閱讀失分有一半來自「沒做完」，而不是「不會」'),
      Util.h('div.stat-grid', { style: { marginTop: '12px' } },
        statCard(proj.minutes + ' 分', '推估完成 100 題', '限制 75 分鐘'),
        statCard(proj.willFinish ? '做得完' : ('超時 ' + proj.overMinutes + ' 分'), '完成度預測',
          proj.measuredParts + '/3 個 Part 有計時資料')
      )
    ));

    var list = Util.h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
    d.pace.forEach(function (p) { list.appendChild(paceRow(p)); });
    host.appendChild(list);

    var data = readingData();
    if (!data || !data.pace) return;

    var rows = data.pace.parts.map(function (p) {
      return Util.h('tr', {},
        Util.h('td', {}, p.name),
        Util.h('td', {}, p.count + ' 題'),
        Util.h('td', {}, p.minutes + ' 分'),
        Util.h('td', {}, p.secPerQ + ' 秒'),
        Util.h('td', {}, p.checkpoint)
      );
    });

    host.appendChild(Util.h('div.card', {},
      Util.h('div.card-title', {}, '官方配速表與考場檢查點'),
      Util.h('div.card-subtitle', {},
        'Reading Section 共 ' + data.pace.totalQuestions + ' 題 / ' + data.pace.totalMinutes + ' 分鐘'),
      Util.h('div.table-wrap.u-mt-md', {},
        Util.h('table.table', {},
          Util.h('thead', {}, Util.h('tr', {},
            Util.h('th', {}, 'Part'), Util.h('th', {}, '題數'), Util.h('th', {}, '時間'),
            Util.h('th', {}, '每題'), Util.h('th', {}, '檢查點')
          )),
          Util.h('tbody', {}, rows)
        )
      )
    ));

    var tips = Util.h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' } });
    data.pace.parts.forEach(function (p) {
      tips.appendChild(Util.h('div', {},
        Util.h('strong', {}, p.name),
        Util.h('p.u-text-muted', { style: { marginTop: '2px' } }, p.tip)
      ));
    });
    data.pace.rules.forEach(function (rule) {
      tips.appendChild(Util.h('p', {}, '・' + rule));
    });
    host.appendChild(Util.h('div.card', {},
      Util.h('div.card-title', {}, '配速心法'),
      tips
    ));
  }

  // -----------------------------------------------------------------------
  // 分頁四：框架
  // -----------------------------------------------------------------------

  function frameworkCard(fw, stat, focused) {
    var steps = Util.h('ol', { style: { margin: '8px 0 0 20px', display: 'flex', flexDirection: 'column', gap: '4px' } },
      fw.steps.map(function (s) { return Util.h('li', {}, s); })
    );

    return Util.h('div.card', {
      id: 'fw-' + fw.id,
      style: focused ? { boxShadow: '0 0 0 2px var(--color-primary)' } : {}
    },
      Util.h('div.card-header', {},
        Util.h('div', {},
          Util.h('div.card-title', {}, fw.title),
          Util.h('div.card-subtitle', {}, fw.when)
        ),
        stat && stat.enough
          ? Util.h('span', { class: 'badge ' + toneClass(stat.level.tone) }, '你的正確率 ' + stat.accuracy + '%')
          : Util.h('span.badge', {}, '目標 ' + fw.seconds + ' 秒')
      ),
      Util.h('div.card-body', {},
        Util.h('strong', {}, '判斷步驟'),
        steps,
        Util.h('div.card', { style: { marginTop: '12px', background: 'var(--color-surface-alt)' } },
          Util.h('p', { style: { fontWeight: 700, marginBottom: '4px' } }, '例句'),
          Util.h('p', { style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }, fw.example.en),
          Util.h('p.u-text-muted', { style: { marginTop: '4px' } }, fw.example.zh),
          Util.h('p', { style: { marginTop: '8px' } }, '💡 ' + fw.example.point)
        ),
        Util.h('p', { style: { marginTop: '10px' } },
          Util.h('span.badge.badge-warning', {}, '常見陷阱'), ' ', fw.trap)
      ),
      Util.h('div.card-actions', {},
        Util.h('button.btn.btn-primary.btn-sm', {
          onClick: function () { goTo('#/quiz?part=P5&skill=' + encodeURIComponent(fw.tag) + '&count=10'); }
        }, '立刻練 10 題')
      )
    );
  }

  function playbookCard(pb, stat) {
    return Util.h('div.card', {},
      Util.h('div.card-header', {},
        Util.h('div', {},
          Util.h('div.card-title', {}, pb.label),
          Util.h('div.card-subtitle', {}, '題目長相：' + pb.signal)
        ),
        stat && stat.enough
          ? Util.h('span', { class: 'badge ' + toneClass(stat.level.tone) }, '你的正確率 ' + stat.accuracy + '%')
          : Util.h('span.badge', {}, '建議 ' + pb.seconds + ' 秒')
      ),
      Util.h('div.card-body', {},
        Util.h('ol', { style: { margin: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: '4px' } },
          pb.steps.map(function (s) { return Util.h('li', {}, s); })),
        Util.h('p', { style: { marginTop: '10px' } },
          Util.h('span.badge.badge-warning', {}, '常見陷阱'), ' ', pb.trap)
      ),
      Util.h('div.card-actions', {},
        Util.h('button.btn.btn-primary.btn-sm', {
          onClick: function () {
            var part = pb.skill === 'sentence_insert' ? 'P6' : 'P7';
            var tag = pb.skill === 'sentence_insert' ? 'sentence' : pb.skill;
            goTo('#/quiz?part=' + part + '&skill=' + encodeURIComponent(tag) + '&count=6');
          }
        }, '練這個題型')
      )
    );
  }

  function renderFrameworks(host, d) {
    var data = readingData();
    if (!data) {
      host.appendChild(Util.h('div.empty-state', {},
        Util.h('div.empty-state-icon', {}, '📭'),
        Util.h('h2', {}, '教材資料未載入'),
        Util.h('p', {}, '請確認 data/reading_frameworks.js 已正確載入。')
      ));
      return;
    }

    var statByKey = {};
    d.skills.forEach(function (r) { statByKey[r.key] = r; });

    var subTabs = Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } },
      [['grammar', 'Part 5 文法框架'], ['p7', 'Part 6/7 題型攻略']].map(function (pair) {
        return Util.h('button', {
          class: 'btn btn-sm ' + (S.fwTab === pair[0] ? 'btn-primary' : 'btn-ghost'),
          onClick: function () { S.fwTab = pair[0]; repaint(); }
        }, pair[1]);
      })
    );

    host.appendChild(Util.h('div.card', {},
      Util.h('div.card-title', {}, S.fwTab === 'grammar' ? '十大文法判斷框架' : 'Part 6/7 題型攻略'),
      Util.h('div.card-subtitle', {}, S.fwTab === 'grammar'
        ? 'Part 5 的考點是固定的。把這十條變成反射動作，30 題可以在 10 分鐘內做完。'
        : '閱讀題型各有各的解法與時間預算。先分辨題型，再套對應的步驟。'),
      Util.h('div', { style: { marginTop: '12px' } }, subTabs)
    ));

    var list = Util.h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } });
    if (S.fwTab === 'grammar') {
      (data.frameworks || []).forEach(function (fw) {
        list.appendChild(frameworkCard(fw, statByKey['P5:' + fw.tag], S.focusFramework === fw.id));
      });
    } else {
      (data.p7Playbook || []).forEach(function (pb) {
        var key = pb.skill === 'sentence_insert' ? 'P6:sentence' : ('P7:' + pb.skill);
        list.appendChild(playbookCard(pb, statByKey[key]));
      });
    }
    host.appendChild(list);

    // 從建議卡「先讀框架」跳過來時，捲到該張卡片
    if (S.focusFramework && S.fwTab === 'grammar') {
      var target = S.focusFramework;
      S.focusFramework = null;
      setTimeout(function () {
        var el = document.getElementById('fw-' + target);
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
      }, 0);
    }
  }

  // -----------------------------------------------------------------------
  // 版面
  // -----------------------------------------------------------------------

  function buildTabBar() {
    var row = Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap', marginBottom: '16px' } });
    TABS.forEach(function (t) {
      row.appendChild(Util.h('button', {
        class: 'btn btn-sm ' + (S.tab === t.code ? 'btn-primary' : 'btn-ghost'),
        onClick: function () { S.tab = t.code; repaint(); }
      }, t.icon + ' ' + t.label));
    });
    return row;
  }

  function repaint() {
    if (!S || !S.bodyEl) return;
    clearNode(S.bodyEl);

    var state;
    try {
      state = Store.get();
    } catch (e) {
      S.bodyEl.appendChild(Util.h('div.empty-state.empty-state-error', {},
        Util.h('div.empty-state-icon', {}, '⚠️'),
        Util.h('h2', {}, '無法讀取學習紀錄'),
        Util.h('p', {}, '請重新整理頁面再試一次。')
      ));
      return;
    }

    var d = Reading.diagnose(state, { today: Util.todayISO() });

    S.bodyEl.appendChild(buildTabBar());
    var host = Util.h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } });
    S.bodyEl.appendChild(host);

    if (S.tab === 'skills') renderSkills(host, d);
    else if (S.tab === 'pace') renderPace(host, d);
    else if (S.tab === 'frameworks') renderFrameworks(host, d);
    else renderDiagnosis(host, d);
  }

  // -----------------------------------------------------------------------
  // render / destroy
  // -----------------------------------------------------------------------

  function render(containerEl, params) {
    container = containerEl;
    params = params || {};

    if (!window.Reading || !window.Store || !window.Util) {
      container.appendChild(Util.h('div.empty-state.empty-state-error', {},
        Util.h('div.empty-state-icon', {}, '⚠️'),
        Util.h('h2', {}, '無法載入閱讀診斷室'),
        Util.h('p', {}, '核心模組（js/reading.js）尚未載入，請重新整理頁面。')
      ));
      return;
    }

    var validTabs = TABS.map(function (t) { return t.code; });
    S = {
      tab: validTabs.indexOf(params.tab) !== -1 ? params.tab : 'diagnosis',
      skillPart: 'all',
      fwTab: 'grammar',
      focusFramework: null,
      bodyEl: null
    };

    if (params.task) {
      try { Store.completeTask(params.task); } catch (e) { /* 任務勾選失敗不阻斷頁面 */ }
    }

    container.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {},
        Util.h('h1', {}, '閱讀診斷室'),
        Util.h('p.view-subtitle', {}, '找出閱讀失分在哪、為什麼、然後直接去補')
      ),
      Util.h('button.btn.btn-primary.btn-sm', {
        onClick: function () { goTo('#/quiz'); }
      }, '✏️ 去做題')
    ));

    S.bodyEl = Util.h('div');
    container.appendChild(S.bodyEl);
    repaint();

    // 在其他頁面作答後回到本頁時，資料要跟著更新
    changeHandler = function () { repaint(); };
    window.addEventListener('toeic30:change', changeHandler);
  }

  function destroy() {
    if (changeHandler) {
      window.removeEventListener('toeic30:change', changeHandler);
      changeHandler = null;
    }
    S = null;
    container = null;
  }

  window.Views = window.Views || {};
  window.Views.reading = { render: render, destroy: destroy };
})();
