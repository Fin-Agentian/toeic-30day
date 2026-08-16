/**
 * js/reading.js — 閱讀（Part 5/6/7）診斷引擎
 *
 * window.Reading：純函式模組，只吃傳進來的 state（Store.get() 的結果）與 TOEIC_DATA，
 * 不自己讀寫 localStorage、不碰 DOM，因此可以直接在 node 測試。
 *
 * 提供：
 *   - skillKey(part, question)  把題目對應到考點 key（'P5:prep'、'P7:inference'…）
 *   - SKILL_LABELS / PACE_TARGET / labelFor(key)
 *   - skillBreakdown(state)     各考點正確率 + 平均秒數，附熟練度分級
 *   - paceReport(state)         各 Part 的實際配速 vs 目標配速
 *   - estimateRC(state)         粗估 Reading 分數（5–495）
 *   - reasonBreakdown(state)    錯因分佈
 *   - diagnose(state)           上面全部 + 依優先序排出的行動建議
 *
 * 依賴：無（window.TOEIC_DATA.reading 缺檔時各函式仍能運作，只是少了教材文字）。
 */
(function (window) {
  'use strict';

  // 每題目標秒數。單一真實來源：quiz.js / mock.js / #/reading 都引用這裡，
  // 依 Reading Section 75 分鐘 100 題的官方配置換算（P5 30題10分、P6 16題8分、P7 54題55分）。
  var PACE_TARGET = { P5: 20, P6: 30, P7: 60 };

  var SKILL_LABELS = {
    'P5:pos': '詞性判斷',
    'P5:tense': '時態',
    'P5:prep': '介系詞',
    'P5:conj': '連接詞',
    'P5:pronoun': '代名詞',
    'P5:agreement': '主謂一致',
    'P5:participle': '分詞／語態',
    'P5:relative': '關係詞',
    'P5:comparison': '比較級',
    'P5:vocab': '字彙搭配',
    'P5:other': '綜合文法',
    'P6:word': '篇章填空',
    'P6:sentence': '句子插入',
    'P7:main_idea': '主旨目的',
    'P7:detail': '細節查找',
    'P7:inference': '推論題',
    'P7:NOT': 'NOT／排除題',
    'P7:vocab_in_context': '文中字義',
    'P7:cross_ref': '跨篇對照'
  };

  var PART_LABELS = { P5: 'Part 5 單句填空', P6: 'Part 6 段落填空', P7: 'Part 7 閱讀理解' };

  // 熟練度分級門檻（正確率 %）
  var LEVELS = [
    { min: 85, code: 'strong', label: '穩定', tone: 'success' },
    { min: 65, code: 'ok', label: '及格', tone: 'primary' },
    { min: 45, code: 'shaky', label: '不穩', tone: 'warning' },
    { min: 0, code: 'weak', label: '弱點', tone: 'danger' }
  ];

  // 樣本太少時不下判斷，只顯示「資料不足」
  var MIN_SAMPLE = 5;

  // 粗估 RC 分數用的錨點：[答對題數（滿分 100）, 換算分數]。
  // 依公開換算表的常見區間取樣後線性內插，僅供自我追蹤，不等於官方分數。
  var RC_CURVE = [
    [0, 5], [10, 25], [20, 60], [30, 105], [40, 150], [50, 200],
    [60, 255], [70, 310], [80, 370], [90, 425], [95, 455], [100, 495]
  ];

  // -------------------------------------------------------------------
  // 小工具
  // -------------------------------------------------------------------

  function pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }

  function readingData() {
    return (window.TOEIC_DATA && window.TOEIC_DATA.reading) || null;
  }

  function labelFor(key) {
    return SKILL_LABELS[key] || key;
  }

  function partOfKey(key) {
    var idx = String(key || '').indexOf(':');
    return idx === -1 ? '' : key.slice(0, idx);
  }

  function tagOfKey(key) {
    var idx = String(key || '').indexOf(':');
    return idx === -1 ? '' : key.slice(idx + 1);
  }

  function levelOf(accuracy) {
    for (var i = 0; i < LEVELS.length; i++) {
      if (accuracy >= LEVELS[i].min) return LEVELS[i];
    }
    return LEVELS[LEVELS.length - 1];
  }

  /**
   * skillKey(part, question) — 由題目物件算出考點 key。
   * P5 用 tag、P6 用 type、P7 用 skill；缺欄位一律歸到 other。
   */
  function skillKey(part, question) {
    var q = question || {};
    if (part === 'P5') return 'P5:' + (q.tag || 'other');
    if (part === 'P6') return 'P6:' + (q.type || 'word');
    if (part === 'P7') return 'P7:' + (q.skill || 'detail');
    return String(part || '') + ':other';
  }

  /** 題庫中每個考點各有幾題，用來提示「這個考點還有多少題可練」 */
  function poolSizeByKey() {
    var data = window.TOEIC_DATA || {};
    var counts = {};
    function bump(key) { counts[key] = (counts[key] || 0) + 1; }

    (data.p5 || []).forEach(function (q) { bump(skillKey('P5', q)); });
    (data.p6 || []).forEach(function (g) {
      (g.questions || []).forEach(function (q) { bump(skillKey('P6', q)); });
    });
    (data.p7 || []).forEach(function (g) {
      (g.questions || []).forEach(function (q) { bump(skillKey('P7', q)); });
    });
    return counts;
  }

  // -------------------------------------------------------------------
  // 考點分析
  // -------------------------------------------------------------------

  /**
   * skillBreakdown(state, opts) — 把 state.readingStats 攤成陣列。
   * opts.part 可過濾單一 Part。回傳依正確率由低到高排序（弱點在前）。
   */
  function skillBreakdown(state, opts) {
    opts = opts || {};
    var stats = (state && state.readingStats) || {};
    var pool = poolSizeByKey();

    var rows = Object.keys(stats).map(function (key) {
      var s = stats[key] || { total: 0, correct: 0, seconds: 0 };
      var part = partOfKey(key);
      var accuracy = pct(s.correct, s.total);
      var avgSeconds = s.total ? Math.round(s.seconds / s.total) : 0;
      var target = PACE_TARGET[part] || 0;
      return {
        key: key,
        part: part,
        tag: tagOfKey(key),
        label: labelFor(key),
        total: s.total,
        correct: s.correct,
        accuracy: accuracy,
        avgSeconds: avgSeconds,
        targetSeconds: target,
        overPace: !!(target && avgSeconds > target * 1.3),
        enough: s.total >= MIN_SAMPLE,
        level: s.total >= MIN_SAMPLE ? levelOf(accuracy) : { code: 'unknown', label: '資料不足', tone: 'muted' },
        poolSize: pool[key] || 0
      };
    });

    if (opts.part) {
      rows = rows.filter(function (r) { return r.part === opts.part; });
    }
    rows.sort(function (a, b) {
      // 有足夠樣本的排前面，其次正確率低的排前面，再其次題數多的排前面
      if (a.enough !== b.enough) return a.enough ? -1 : 1;
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.total - a.total;
    });
    return rows;
  }

  /** 尚未練過的考點（題庫裡有、但 readingStats 沒紀錄），提醒別漏練 */
  function untouchedSkills(state) {
    var stats = (state && state.readingStats) || {};
    var pool = poolSizeByKey();
    return Object.keys(pool)
      .filter(function (key) { return !stats[key] || !stats[key].total; })
      .map(function (key) {
        return { key: key, label: labelFor(key), part: partOfKey(key), tag: tagOfKey(key), poolSize: pool[key] };
      })
      .sort(function (a, b) { return b.poolSize - a.poolSize; });
  }

  // -------------------------------------------------------------------
  // 配速分析
  // -------------------------------------------------------------------

  /**
   * paceReport(state) — 依 quizHistory 中的閱讀紀錄（mode='quiz'）算各 Part 實際配速。
   * 回傳每個 Part 的 { avgSeconds, targetSeconds, ratio, verdict }。
   */
  function paceReport(state) {
    var history = (state && state.quizHistory) || [];
    var acc = {};
    history.forEach(function (entry) {
      if (!entry || entry.mode !== 'quiz') return;
      var part = entry.part;
      if (!PACE_TARGET[part]) return;
      if (!acc[part]) acc[part] = { seconds: 0, questions: 0, correct: 0, sessions: 0 };
      acc[part].seconds += entry.seconds || 0;
      acc[part].questions += entry.total || 0;
      acc[part].correct += entry.correct || 0;
      acc[part].sessions += 1;
    });

    return ['P5', 'P6', 'P7'].map(function (part) {
      var a = acc[part];
      var target = PACE_TARGET[part];
      if (!a || !a.questions) {
        return {
          part: part, label: PART_LABELS[part], targetSeconds: target,
          avgSeconds: 0, questions: 0, sessions: 0, accuracy: 0,
          ratio: 0, verdict: 'none', verdictText: '尚無計時紀錄'
        };
      }
      var avg = Math.round(a.seconds / a.questions);
      var ratio = target ? avg / target : 0;
      var verdict = 'ok';
      var verdictText = '配速在目標範圍內';
      if (ratio > 1.5) { verdict = 'slow'; verdictText = '明顯超時，正式考會做不完'; }
      else if (ratio > 1.15) { verdict = 'warn'; verdictText = '略慢，還有壓縮空間'; }
      else if (ratio < 0.6 && pct(a.correct, a.questions) < 70) {
        verdict = 'rush'; verdictText = '偏快但正確率低，像是在亂猜';
      }
      return {
        part: part, label: PART_LABELS[part], targetSeconds: target,
        avgSeconds: avg, questions: a.questions, sessions: a.sessions,
        accuracy: pct(a.correct, a.questions),
        ratio: Math.round(ratio * 100) / 100,
        verdict: verdict, verdictText: verdictText
      };
    });
  }

  /**
   * projectedFinish(state) — 用目前配速推估：整份 Reading 75 分鐘做得完嗎？
   * 沒資料的 Part 用目標配速代入。
   */
  function projectedFinish(state) {
    var report = paceReport(state);
    var counts = { P5: 30, P6: 16, P7: 54 };
    var totalSeconds = 0;
    var measured = 0;
    report.forEach(function (r) {
      var sec = r.avgSeconds || r.targetSeconds;
      if (r.avgSeconds) measured += 1;
      totalSeconds += sec * counts[r.part];
    });
    return {
      minutes: Math.round(totalSeconds / 60),
      limitMinutes: 75,
      overMinutes: Math.round((totalSeconds - 75 * 60) / 60),
      measuredParts: measured,
      willFinish: totalSeconds <= 75 * 60
    };
  }

  // -------------------------------------------------------------------
  // 分數粗估
  // -------------------------------------------------------------------

  /** curveToScore(rawOutOf100) — 依 RC_CURVE 線性內插 */
  function curveToScore(raw) {
    var x = Math.max(0, Math.min(100, raw));
    for (var i = 0; i < RC_CURVE.length - 1; i++) {
      var a = RC_CURVE[i];
      var b = RC_CURVE[i + 1];
      if (x >= a[0] && x <= b[0]) {
        var span = b[0] - a[0];
        var t = span ? (x - a[0]) / span : 0;
        return Math.round(a[1] + t * (b[1] - a[1]));
      }
    }
    return 5;
  }

  /**
   * estimateRC(state) — 用整體閱讀正確率粗估 Reading 分數。
   * 只採計 mode='quiz'（閱讀做題）與 mode='mock'（模考）的紀錄。
   * sample < 30 題時標記 confidence:'low'，UI 應提示樣本不足。
   */
  function estimateRC(state) {
    var history = (state && state.quizHistory) || [];
    var total = 0;
    var correct = 0;
    history.forEach(function (entry) {
      if (!entry) return;
      if (entry.mode !== 'quiz' && entry.mode !== 'mock') return;
      total += entry.total || 0;
      correct += entry.correct || 0;
    });

    if (!total) {
      return { score: null, accuracy: 0, sample: 0, confidence: 'none', nextScore: null, questionsToNext: null };
    }

    var accuracy = pct(correct, total);
    var score = curveToScore(accuracy);

    // 「再多對幾題就能跳一級」：以 50 分為一個級距
    var nextScore = Math.min(495, (Math.floor(score / 50) + 1) * 50);
    var questionsToNext = null;
    for (var raw = accuracy; raw <= 100; raw++) {
      if (curveToScore(raw) >= nextScore) { questionsToNext = raw - accuracy; break; }
    }

    return {
      score: score,
      accuracy: accuracy,
      sample: total,
      confidence: total >= 100 ? 'high' : (total >= 30 ? 'medium' : 'low'),
      nextScore: nextScore,
      questionsToNext: questionsToNext
    };
  }

  // -------------------------------------------------------------------
  // 錯因分佈
  // -------------------------------------------------------------------

  function reasonBreakdown(state) {
    var wb = (state && state.wrongBook) || {};
    var data = readingData();
    var defs = (data && data.reasons) || [];
    var counts = {};
    var untagged = 0;
    var totalReading = 0;

    Object.keys(wb).forEach(function (id) {
      if (!/^p[567]-/.test(id)) return; // 只看閱讀錯題
      totalReading += 1;
      var reason = wb[id] && wb[id].reason;
      if (!reason) { untagged += 1; return; }
      counts[reason] = (counts[reason] || 0) + 1;
    });

    var rows = defs.map(function (d) {
      return {
        code: d.code, label: d.label, icon: d.icon, advice: d.advice,
        count: counts[d.code] || 0,
        share: pct(counts[d.code] || 0, totalReading)
      };
    }).sort(function (a, b) { return b.count - a.count; });

    return { rows: rows, untagged: untagged, total: totalReading };
  }

  // -------------------------------------------------------------------
  // 綜合診斷 + 行動建議
  // -------------------------------------------------------------------

  function drillHash(key, count) {
    var part = partOfKey(key);
    var tag = tagOfKey(key);
    return '#/quiz?part=' + encodeURIComponent(part) +
      '&skill=' + encodeURIComponent(tag) +
      '&count=' + (count || 10);
  }

  function frameworkForTag(tag) {
    var data = readingData();
    if (!data || !data.frameworks) return null;
    for (var i = 0; i < data.frameworks.length; i++) {
      if (data.frameworks[i].tag === tag) return data.frameworks[i];
    }
    return null;
  }

  /**
   * advice(state) — 依優先序產生 3–5 條可執行建議。
   * 排序邏輯（分數低的人回收最快的順序）：
   *   1. 有錯題到期沒複習 → 先清錯題（重做一題的期望增益大於做新題）
   *   2. Part 5 弱考點 → 秒殺型考點，讀框架 + 專項練習
   *   3. 配速嚴重超時 → 練縮時，否則實力再好也做不完
   *   4. Part 7 弱題型 → 讀攻略 + 專項練習
   *   5. 沒碰過的考點 → 補齊覆蓋率
   */
  function advice(state, opts) {
    opts = opts || {};
    var today = opts.today || null;
    var out = [];

    // 1. 到期錯題
    var wb = (state && state.wrongBook) || {};
    var dueCount = 0;
    Object.keys(wb).forEach(function (id) {
      var e = wb[id] || {};
      if (e.mastered) return;
      if (!today || !e.due || e.due <= today) dueCount += 1;
    });
    if (dueCount >= 3) {
      out.push({
        priority: 1, kind: 'review', icon: '🔁',
        title: '先清掉 ' + dueCount + ' 題到期錯題',
        detail: '重做一題已經錯過的題目，比做一題新題更容易加分。做完再去練新題。',
        actionLabel: '去錯題本',
        hash: '#/review?due=1'
      });
    }

    var rows = skillBreakdown(state);
    var enoughRows = rows.filter(function (r) { return r.enough; });

    // 2. Part 5 弱考點（最多兩個）
    enoughRows.filter(function (r) { return r.part === 'P5' && r.accuracy < 65; })
      .slice(0, 2)
      .forEach(function (r) {
        var fw = frameworkForTag(r.tag);
        out.push({
          priority: 2, kind: 'skill', icon: '📐',
          title: 'Part 5「' + r.label + '」正確率只有 ' + r.accuracy + '%',
          detail: (fw ? '先讀判斷框架「' + fw.title + '」，' : '') +
            '再做 10 題同考點專項練習（題庫還有 ' + r.poolSize + ' 題）。',
          actionLabel: '練 10 題 ' + r.label,
          hash: drillHash(r.key, 10),
          frameworkId: fw ? fw.id : null,
          skillKey: r.key
        });
      });

    // 3. 配速
    paceReport(state).forEach(function (p) {
      if (p.verdict === 'slow') {
        out.push({
          priority: 3, kind: 'pace', icon: '⏱️',
          title: p.label + '平均每題 ' + p.avgSeconds + ' 秒，目標是 ' + p.targetSeconds + ' 秒',
          detail: '照這個速度正式考會做不完。開計時做 10 題，強迫自己超過目標秒數就先猜再跳。',
          actionLabel: '計時練 ' + p.part,
          hash: '#/quiz?part=' + p.part + '&count=10'
        });
      } else if (p.verdict === 'rush') {
        out.push({
          priority: 3, kind: 'pace', icon: '⚠️',
          title: p.label + '答得快但正確率只有 ' + p.accuracy + '%',
          detail: '速度不是問題，是讀得不夠仔細。放慢到接近目標秒數，先把正確率拉到 70%。',
          actionLabel: '重練 ' + p.part,
          hash: '#/quiz?part=' + p.part + '&count=10'
        });
      }
    });

    // 4. Part 7 弱題型
    enoughRows.filter(function (r) { return r.part === 'P7' && r.accuracy < 60; })
      .slice(0, 2)
      .forEach(function (r) {
        out.push({
          priority: 4, kind: 'skill', icon: '📖',
          title: 'Part 7「' + r.label + '」正確率只有 ' + r.accuracy + '%',
          detail: '在閱讀診斷室讀這個題型的攻略步驟，再做同題型專項練習。',
          actionLabel: '練 ' + r.label,
          hash: drillHash(r.key, 6),
          skillKey: r.key
        });
      });

    // 5. 覆蓋率
    var untouched = untouchedSkills(state);
    if (untouched.length && out.length < 5) {
      var names = untouched.slice(0, 3).map(function (u) { return u.label; }).join('、');
      out.push({
        priority: 5, kind: 'coverage', icon: '🗺️',
        title: '還有 ' + untouched.length + ' 個考點完全沒練過',
        detail: '包含 ' + names + ' 等。先各做幾題，診斷才有資料可以判斷強弱。',
        actionLabel: '練 ' + untouched[0].label,
        hash: drillHash(untouched[0].key, 10),
        skillKey: untouched[0].key
      });
    }

    if (!out.length) {
      out.push({
        priority: 9, kind: 'idle', icon: '✅',
        title: '目前沒有明顯弱點',
        detail: '各考點正確率與配速都在範圍內。維持每天一組計時練習，並保持錯題本清空。',
        actionLabel: '做一組計時練習',
        hash: '#/quiz?part=P7&count=6'
      });
    }

    out.sort(function (a, b) { return a.priority - b.priority; });
    return out.slice(0, 5);
  }

  /** diagnose(state, opts) — 一次拿到閱讀診斷室要的所有資料 */
  function diagnose(state, opts) {
    opts = opts || {};
    return {
      rc: estimateRC(state),
      skills: skillBreakdown(state),
      untouched: untouchedSkills(state),
      pace: paceReport(state),
      projection: projectedFinish(state),
      reasons: reasonBreakdown(state),
      advice: advice(state, opts)
    };
  }

  window.Reading = {
    PACE_TARGET: PACE_TARGET,
    SKILL_LABELS: SKILL_LABELS,
    PART_LABELS: PART_LABELS,
    MIN_SAMPLE: MIN_SAMPLE,
    skillKey: skillKey,
    labelFor: labelFor,
    partOfKey: partOfKey,
    tagOfKey: tagOfKey,
    levelOf: levelOf,
    poolSizeByKey: poolSizeByKey,
    skillBreakdown: skillBreakdown,
    untouchedSkills: untouchedSkills,
    paceReport: paceReport,
    projectedFinish: projectedFinish,
    curveToScore: curveToScore,
    estimateRC: estimateRC,
    reasonBreakdown: reasonBreakdown,
    frameworkForTag: frameworkForTag,
    drillHash: drillHash,
    advice: advice,
    diagnose: diagnose
  };
})(typeof window !== 'undefined' ? window : globalThis);
