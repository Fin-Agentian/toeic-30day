#!/usr/bin/env node
'use strict';
// scripts/validate_data.js
// 載入 data/*.js（node vm sandbox，ctx = { window: {} }）並依 docs/DESIGN.md §5 驗證所有 schema。
// 用法： node scripts/validate_data.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

// DESIGN.md §3 列出的 13 個 data 檔，依 index.html 預期載入順序
const FILES = [
  'tips.js',
  'plan.js',
  'vocab_1.js',
  'vocab_2.js',
  'questions_p5_1.js',
  'questions_p5_2.js',
  'questions_p5_3.js',
  'questions_p6.js',
  'questions_p7_1.js',
  'questions_p7_2.js',
  'listening_1.js',
  'listening_2.js',
  'listening_3.js',
];

// ---------- 共用工具 ----------
const errors = [];
const missingFiles = [];
const loadErrors = [];
const idToFile = new Map();

function err(file, id, msg) {
  errors.push(`[${file}] [${id}] ${msg}`);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}
function isInt(v) {
  return Number.isInteger(v);
}
function isHttpUrl(v) {
  return typeof v === 'string' && /^https?:\/\/\S+/.test(v);
}

// ---------- 載入 data/*.js（vm sandbox） ----------
const sandbox = { window: {}, console };
vm.createContext(sandbox);

function snapshotArrays() {
  const td = sandbox.window.TOEIC_DATA || {};
  const listening = td.listening || {};
  return {
    tips: (td.tips || []).length,
    vocab: (td.vocab || []).length,
    p5: (td.p5 || []).length,
    p6: (td.p6 || []).length,
    p7: (td.p7 || []).length,
    l1: (listening.p1 || []).length,
    l2: (listening.p2 || []).length,
    l3: (listening.p3 || []).length,
    l4: (listening.p4 || []).length,
  };
}

function attributeNew(arr, beforeLen, afterLen, fname) {
  if (!Array.isArray(arr)) return;
  for (let i = beforeLen; i < afterLen; i++) {
    const item = arr[i];
    if (item && item.id) idToFile.set(item.id, `data/${fname}`);
  }
}

console.log('=== TOEIC30 資料驗證 ===\n');

for (const fname of FILES) {
  const fpath = path.join(DATA_DIR, fname);
  if (!fs.existsSync(fpath)) {
    console.log(`MISSING data/${fname}`);
    missingFiles.push(fname);
    continue;
  }
  const before = snapshotArrays();
  let code;
  try {
    code = fs.readFileSync(fpath, 'utf8');
    vm.runInContext(code, sandbox, { filename: fpath });
  } catch (e) {
    loadErrors.push(`data/${fname}: ${e.message}`);
    err(`data/${fname}`, '-', `載入失敗: ${e.message}`);
    continue;
  }
  const after = snapshotArrays();
  const td = sandbox.window.TOEIC_DATA || {};
  const listening = td.listening || {};
  attributeNew(td.tips, before.tips, after.tips, fname);
  attributeNew(td.vocab, before.vocab, after.vocab, fname);
  attributeNew(td.p5, before.p5, after.p5, fname);
  attributeNew(td.p6, before.p6, after.p6, fname);
  attributeNew(td.p7, before.p7, after.p7, fname);
  attributeNew(listening.p1, before.l1, after.l1, fname);
  attributeNew(listening.p2, before.l2, after.l2, fname);
  attributeNew(listening.p3, before.l3, after.l3, fname);
  attributeNew(listening.p4, before.l4, after.l4, fname);

  if (fname === 'plan.js' && td.plan && Array.isArray(td.plan.days)) {
    for (const d of td.plan.days) {
      if (Array.isArray(d.tasks)) {
        for (const t of d.tasks) {
          if (t && t.id) idToFile.set(t.id, `data/${fname}`);
        }
      }
    }
  }
}

const TD = sandbox.window.TOEIC_DATA || {};

// ---------- 5.1 tips ----------
const TIPS_PARTS = new Set(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'General', 'Vocab', 'Time', 'Plan']);
const PRIORITIES = new Set(['high', 'medium', 'low']);

function validateTips(tips) {
  const stats = {};
  TIPS_PARTS.forEach((p) => (stats[p] = 0));
  if (!Array.isArray(tips)) {
    errors.push('[data/tips.js] [-] TOEIC_DATA.tips 不是陣列');
    return stats;
  }
  const seen = new Set();
  tips.forEach((tip, idx) => {
    const file = idToFile.get(tip && tip.id) || 'data/tips.js';
    const label = tip && tip.id ? tip.id : `#${idx}`;
    if (!tip || typeof tip !== 'object') {
      err(file, label, 'tip 不是物件');
      return;
    }
    if (!isNonEmptyString(tip.id)) err(file, label, '缺少 id');
    if (!TIPS_PARTS.has(tip.part)) err(file, label, `part 值域錯誤: ${tip.part}`);
    if (!isNonEmptyString(tip.title_zh)) err(file, label, '缺少 title_zh');
    if (!isNonEmptyString(tip.title_en)) err(file, label, '缺少 title_en');
    if (!isNonEmptyString(tip.detail_zh)) err(file, label, '缺少 detail_zh');
    if (!Array.isArray(tip.steps)) err(file, label, 'steps 需為陣列');
    if (!Array.isArray(tip.pitfalls)) err(file, label, 'pitfalls 需為陣列');
    if (typeof tip.example !== 'string') err(file, label, 'example 需為字串（可為空字串）');
    if (!PRIORITIES.has(tip.priority)) err(file, label, `priority 值域錯誤: ${tip.priority}`);
    if (!Array.isArray(tip.sources) || tip.sources.length === 0) {
      err(file, label, 'sources 需為非空陣列');
    } else {
      tip.sources.forEach((s) => {
        if (!isHttpUrl(s)) err(file, label, `sources 內含非法 URL: ${s}`);
      });
    }
    if (isNonEmptyString(tip.id) && isNonEmptyString(tip.part) && !tip.id.startsWith(`${tip.part}-`)) {
      err(file, label, `id 前綴與 part 不符 (id=${tip.id}, part=${tip.part})`);
    }
    if (isNonEmptyString(tip.id)) {
      if (seen.has(tip.id)) err(file, label, `id 重複: ${tip.id}`);
      seen.add(tip.id);
    }
    if (TIPS_PARTS.has(tip.part)) stats[tip.part]++;
  });
  return stats;
}

// ---------- 5.2 plan ----------
const TASK_TYPES = new Set(['tips', 'quiz', 'listening', 'vocab', 'mock', 'review', 'read']);
const QUIZ_PARTS = new Set(['P5', 'P6', 'P7']);
const LISTEN_PARTS = new Set(['P1', 'P2', 'P3', 'P4']);
const MOCK_PRESETS = new Set(['mini', 'half']);

function validatePlanRef(file, label, type, ref) {
  const r = ref || {};
  switch (type) {
    case 'tips':
      if (!isNonEmptyString(r.part)) err(file, label, 'ref.part 缺失（tips）');
      if (r.count === undefined && r.ids === undefined) err(file, label, 'ref 需要 count 或 ids（tips）');
      break;
    case 'quiz':
      if (!QUIZ_PARTS.has(r.part)) err(file, label, `ref.part 值域錯誤（quiz）: ${r.part}`);
      if (!isInt(r.count) || r.count <= 0) err(file, label, 'ref.count 需為正整數（quiz）');
      break;
    case 'listening':
      if (!LISTEN_PARTS.has(r.part)) err(file, label, `ref.part 值域錯誤（listening）: ${r.part}`);
      if (!isInt(r.count) || r.count <= 0) err(file, label, 'ref.count 需為正整數（listening）');
      break;
    case 'vocab':
      if (!isInt(r.newWords) || r.newWords < 0) err(file, label, 'ref.newWords 需為非負整數（vocab）');
      if (typeof r.review !== 'boolean') err(file, label, 'ref.review 需為布林（vocab）');
      break;
    case 'mock':
      if (!MOCK_PRESETS.has(r.preset)) err(file, label, `ref.preset 值域錯誤（mock）: ${r.preset}`);
      break;
    case 'review':
      break;
    case 'read':
      if (!isNonEmptyString(r.note)) err(file, label, 'ref.note 缺失（read）');
      break;
    default:
      break;
  }
}

function validatePlan(plan, planFileMissing) {
  const file = 'data/plan.js';
  if (planFileMissing) return { days: 0 };
  if (!plan || typeof plan !== 'object') {
    err(file, '-', 'TOEIC_DATA.plan 缺失或格式錯誤');
    return { days: 0 };
  }
  if (!isNonEmptyString(plan.examDate)) err(file, '-', '缺少 examDate');
  if (plan.totalDays !== 30) err(file, '-', `totalDays 應為 30，實際 ${plan.totalDays}`);
  if (!Array.isArray(plan.days)) {
    err(file, '-', 'days 需為陣列');
    return { days: 0 };
  }
  if (plan.days.length !== 30) err(file, '-', `days 長度應為 30，實際 ${plan.days.length}`);

  const seenTaskIds = new Set();
  const sortedDays = plan.days.slice().sort((a, b) => (a.day || 0) - (b.day || 0));
  let expectedDay = 1;
  sortedDays.forEach((d) => {
    const dayLabel = `day${d && d.day}`;
    if (d.day !== expectedDay) err(file, dayLabel, `day 不連續，期望 ${expectedDay} 實際 ${d.day}`);
    expectedDay++;
    if (!isNonEmptyString(d.theme)) err(file, dayLabel, '缺少 theme');
    if (!isInt(d.minutes) || d.minutes <= 0) err(file, dayLabel, 'minutes 需為正整數');
    if (!Array.isArray(d.tasks) || d.tasks.length < 1) {
      err(file, dayLabel, 'tasks 至少需要 1 項');
      return;
    }
    d.tasks.forEach((t) => {
      const label = t && t.id ? t.id : `${dayLabel}-?`;
      if (!isNonEmptyString(t.id)) {
        err(file, dayLabel, 'task 缺少 id');
      } else {
        if (seenTaskIds.has(t.id)) err(file, label, `task id 重複: ${t.id}`);
        seenTaskIds.add(t.id);
      }
      if (!TASK_TYPES.has(t.type)) err(file, label, `type 值域錯誤: ${t.type}`);
      if (!isNonEmptyString(t.label)) err(file, label, '缺少 label');
      if (TASK_TYPES.has(t.type)) validatePlanRef(file, label, t.type, t.ref);
    });
  });
  return { days: plan.days.length };
}

// ---------- 5.3 vocab ----------
const TOPICS = new Set([
  'finance', 'office', 'hr', 'marketing', 'travel', 'logistics',
  'manufacturing', 'tech', 'real_estate', 'dining', 'health', 'general',
]);
const LEVELS = new Set(['core', 'advanced']);

function validateVocab(vocab) {
  const stats = { total: 0, core: 0, advanced: 0 };
  if (!Array.isArray(vocab)) {
    errors.push('[data/vocab_*.js] [-] TOEIC_DATA.vocab 不是陣列');
    return stats;
  }
  const seenIds = new Set();
  const seenWords = new Set();
  vocab.forEach((w, idx) => {
    const file = idToFile.get(w && w.id) || 'data/vocab_*.js';
    const label = w && w.id ? w.id : `#${idx}`;
    if (!/^v\d{4}$/.test((w && w.id) || '')) {
      err(file, label, `id 格式錯誤（需為 v0000）: ${w && w.id}`);
    } else {
      if (seenIds.has(w.id)) err(file, label, `id 重複: ${w.id}`);
      seenIds.add(w.id);
    }
    if (!isNonEmptyString(w.word)) {
      err(file, label, '缺少 word');
    } else {
      const wl = w.word.toLowerCase();
      if (seenWords.has(wl)) err(file, label, `word 重複（不分大小寫）: ${w.word}`);
      seenWords.add(wl);
    }
    if (!isNonEmptyString(w.pos)) err(file, label, '缺少 pos');
    if (!isNonEmptyString(w.zh)) err(file, label, '缺少 zh');
    if (!isNonEmptyString(w.example)) err(file, label, '缺少 example');
    if (!isNonEmptyString(w.example_zh)) err(file, label, '缺少 example_zh');
    if (!TOPICS.has(w.topic)) err(file, label, `topic 值域錯誤: ${w.topic}`);
    if (!LEVELS.has(w.level)) err(file, label, `level 值域錯誤: ${w.level}`);
    if (!Array.isArray(w.collocations)) err(file, label, 'collocations 需為陣列');
    stats.total++;
    if (w.level === 'core') stats.core++;
    if (w.level === 'advanced') stats.advanced++;
  });
  return stats;
}

// ---------- 5.4 p5 ----------
const P5_TAGS = new Set([
  'pronoun', 'pos', 'tense', 'prep', 'conj', 'vocab',
  'agreement', 'relative', 'participle', 'comparison', 'other',
]);

function validateP5(p5) {
  const stats = { total: 0 };
  if (!Array.isArray(p5)) {
    errors.push('[data/questions_p5_*.js] [-] TOEIC_DATA.p5 不是陣列');
    return stats;
  }
  const seen = new Set();
  p5.forEach((q, idx) => {
    const file = idToFile.get(q && q.id) || 'data/questions_p5_*.js';
    const label = q && q.id ? q.id : `#${idx}`;
    if (!isNonEmptyString(q.id)) {
      err(file, label, '缺少 id');
    } else {
      if (seen.has(q.id)) err(file, label, `id 重複: ${q.id}`);
      seen.add(q.id);
    }
    if (!isNonEmptyString(q.stem)) err(file, label, '缺少 stem');
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      err(file, label, `options 長度需為 4，實際 ${q.options && q.options.length}`);
    }
    if (!isInt(q.answer) || q.answer < 0 || q.answer > 3) err(file, label, `answer 需為 0..3，實際 ${q.answer}`);
    if (!isNonEmptyString(q.explanation_zh)) err(file, label, '缺少 explanation_zh');
    if (!P5_TAGS.has(q.tag)) err(file, label, `tag 值域錯誤: ${q.tag}`);
    if (![1, 2, 3].includes(q.difficulty)) err(file, label, `difficulty 值域錯誤: ${q.difficulty}`);
    stats.total++;
  });
  return stats;
}

// ---------- 5.5 p6 ----------
const P6_QTYPES = new Set(['word', 'sentence']);

function validateP6(p6) {
  const stats = { articles: 0, questions: 0 };
  if (!Array.isArray(p6)) {
    errors.push('[data/questions_p6.js] [-] TOEIC_DATA.p6 不是陣列');
    return stats;
  }
  const seenIds = new Set();
  p6.forEach((art, idx) => {
    const file = idToFile.get(art && art.id) || 'data/questions_p6.js';
    const label = art && art.id ? art.id : `#${idx}`;
    if (!isNonEmptyString(art.id)) {
      err(file, label, '缺少 id');
    } else {
      if (seenIds.has(art.id)) err(file, label, `id 重複: ${art.id}`);
      seenIds.add(art.id);
    }
    if (!isNonEmptyString(art.title)) err(file, label, '缺少 title');
    if (!isNonEmptyString(art.passage)) {
      err(file, label, '缺少 passage');
    } else {
      for (let n = 1; n <= 4; n++) {
        if (!art.passage.includes(`[${n}]`)) err(file, label, `passage 缺少標記 [${n}]`);
      }
    }
    if (!Array.isArray(art.questions) || art.questions.length !== 4) {
      err(file, label, `questions 需 4 題，實際 ${art.questions && art.questions.length}`);
    } else {
      art.questions.forEach((q) => {
        const qLabel = `${label}-q${q && q.n}`;
        if (!Array.isArray(q.options) || q.options.length !== 4) err(file, qLabel, 'options 長度需為 4');
        if (!isInt(q.answer) || q.answer < 0 || q.answer > 3) err(file, qLabel, `answer 需為 0..3，實際 ${q.answer}`);
        if (!P6_QTYPES.has(q.type)) err(file, qLabel, `type 值域錯誤: ${q.type}`);
        if (!isNonEmptyString(q.explanation_zh)) err(file, qLabel, '缺少 explanation_zh');
        stats.questions++;
      });
    }
    stats.articles++;
  });
  return stats;
}

// ---------- 5.6 p7 ----------
const P7_TYPES = new Set(['single', 'double', 'triple']);
const P7_SKILLS = new Set([
  'main_idea', 'detail', 'inference', 'NOT', 'vocab_in_context', 'sentence_insert', 'cross_ref',
]);
const P7_KINDS = new Set([
  'email', 'notice', 'article', 'ad', 'form', 'chat', 'memo', 'schedule', 'invoice', 'letter',
]);
const P7_EXPECTED_PASSAGES = { single: 1, double: 2, triple: 3 };

function validateP7(p7) {
  const stats = { total: 0, single: 0, double: 0, triple: 0, questions: 0 };
  if (!Array.isArray(p7)) {
    errors.push('[data/questions_p7_*.js] [-] TOEIC_DATA.p7 不是陣列');
    return stats;
  }
  const seenIds = new Set();
  p7.forEach((grp, idx) => {
    const file = idToFile.get(grp && grp.id) || 'data/questions_p7_*.js';
    const label = grp && grp.id ? grp.id : `#${idx}`;
    if (!isNonEmptyString(grp.id)) {
      err(file, label, '缺少 id');
    } else {
      if (seenIds.has(grp.id)) err(file, label, `id 重複: ${grp.id}`);
      seenIds.add(grp.id);
    }
    if (!P7_TYPES.has(grp.type)) {
      err(file, label, `type 值域錯誤: ${grp.type}`);
    } else {
      stats[grp.type]++;
      const exp = P7_EXPECTED_PASSAGES[grp.type];
      if (!Array.isArray(grp.passages) || grp.passages.length !== exp) {
        err(file, label, `passages 長度應為 ${exp}（${grp.type}），實際 ${grp.passages && grp.passages.length}`);
      } else {
        grp.passages.forEach((p, pi) => {
          if (!P7_KINDS.has(p.kind)) err(file, `${label}-p${pi}`, `passage kind 值域錯誤: ${p.kind}`);
          if (!isNonEmptyString(p.text)) err(file, `${label}-p${pi}`, 'passage 缺少 text');
        });
      }
    }
    if (!Array.isArray(grp.questions) || grp.questions.length < 2) {
      err(file, label, `questions 至少需要 2 題，實際 ${grp.questions && grp.questions.length}`);
    } else {
      grp.questions.forEach((q, qi) => {
        const qLabel = `${label}-q${qi}`;
        if (!isNonEmptyString(q.q)) err(file, qLabel, '題目缺少 q');
        if (!Array.isArray(q.options) || q.options.length !== 4) err(file, qLabel, 'options 長度需為 4');
        if (!isInt(q.answer) || q.answer < 0 || q.answer > 3) err(file, qLabel, `answer 需為 0..3，實際 ${q.answer}`);
        if (!P7_SKILLS.has(q.skill)) err(file, qLabel, `skill 值域錯誤: ${q.skill}`);
        stats.questions++;
      });
    }
    stats.total++;
  });
  return stats;
}

// ---------- 5.7 listening ----------
const L2_TRAPS = new Set(['similar_sound', 'wh_word', 'indirect', 'yes_no', 'other']);
const L4_KINDS = new Set(['announcement', 'voicemail', 'talk', 'ad', 'news', 'tour']);

function validateListening(listening) {
  const stats = { p1: 0, p2: 0, p3: 0, p4: 0 };
  if (!listening || typeof listening !== 'object') return stats;

  const allIds = new Set();
  function checkIdUnique(id, file, label) {
    if (!isNonEmptyString(id)) {
      err(file, label, '缺少 id');
      return;
    }
    if (allIds.has(id)) err(file, label, `id 重複: ${id}`);
    allIds.add(id);
  }

  (listening.p1 || []).forEach((it, idx) => {
    const file = idToFile.get(it && it.id) || 'data/listening_1.js';
    const label = it && it.id ? it.id : `p1#${idx}`;
    checkIdUnique(it.id, file, label);
    if (!Array.isArray(it.statements) || it.statements.length !== 4) {
      err(file, label, `statements 需 4 句，實際 ${it.statements && it.statements.length}`);
    }
    if (!isInt(it.answer) || it.answer < 0 || it.answer > 3) err(file, label, `answer 需為 0..3，實際 ${it.answer}`);
    stats.p1++;
  });

  (listening.p2 || []).forEach((it, idx) => {
    const file = idToFile.get(it && it.id) || 'data/listening_1.js';
    const label = it && it.id ? it.id : `p2#${idx}`;
    checkIdUnique(it.id, file, label);
    if (!Array.isArray(it.responses) || it.responses.length !== 3) {
      err(file, label, `responses 需 3 句，實際 ${it.responses && it.responses.length}`);
    }
    if (!isInt(it.answer) || it.answer < 0 || it.answer > 2) err(file, label, `answer 需為 0..2，實際 ${it.answer}`);
    if (!L2_TRAPS.has(it.trap)) err(file, label, `trap 值域錯誤: ${it.trap}`);
    stats.p2++;
  });

  (listening.p3 || []).forEach((it, idx) => {
    const file = idToFile.get(it && it.id) || 'data/listening_2.js';
    const label = it && it.id ? it.id : `p3#${idx}`;
    checkIdUnique(it.id, file, label);
    if (!Array.isArray(it.script) || it.script.length === 0) {
      err(file, label, 'script 需為非空陣列');
    } else {
      it.script.forEach((line, i) => {
        if (!isNonEmptyString(line.s)) err(file, label, `script[${i}] 缺少 s`);
        if (!isNonEmptyString(line.t)) err(file, label, `script[${i}] 缺少 t`);
      });
    }
    if (!Array.isArray(it.questions) || it.questions.length !== 3) {
      err(file, label, `questions 需 3 題，實際 ${it.questions && it.questions.length}`);
    } else {
      it.questions.forEach((q, qi) => {
        const qLabel = `${label}-q${qi}`;
        if (!Array.isArray(q.options) || q.options.length !== 4) err(file, qLabel, 'options 長度需為 4');
        if (!isInt(q.answer) || q.answer < 0 || q.answer > 3) err(file, qLabel, `answer 需為 0..3，實際 ${q.answer}`);
      });
    }
    stats.p3++;
  });

  (listening.p4 || []).forEach((it, idx) => {
    const file = idToFile.get(it && it.id) || 'data/listening_3.js';
    const label = it && it.id ? it.id : `p4#${idx}`;
    checkIdUnique(it.id, file, label);
    if (!L4_KINDS.has(it.kind)) err(file, label, `kind 值域錯誤: ${it.kind}`);
    if (!isNonEmptyString(it.script)) err(file, label, '缺少 script');
    if (!Array.isArray(it.questions) || it.questions.length !== 3) {
      err(file, label, `questions 需 3 題，實際 ${it.questions && it.questions.length}`);
    } else {
      it.questions.forEach((q, qi) => {
        const qLabel = `${label}-q${qi}`;
        if (!Array.isArray(q.options) || q.options.length !== 4) err(file, qLabel, 'options 長度需為 4');
        if (!isInt(q.answer) || q.answer < 0 || q.answer > 3) err(file, qLabel, `answer 需為 0..3，實際 ${q.answer}`);
      });
    }
    stats.p4++;
  });

  return stats;
}

// ---------- 執行驗證 ----------
const tipsStats = validateTips(TD.tips || []);
const planStats = validatePlan(TD.plan, missingFiles.includes('plan.js'));
const vocabStats = validateVocab(TD.vocab || []);
const p5Stats = validateP5(TD.p5 || []);
const p6Stats = validateP6(TD.p6 || []);
const p7Stats = validateP7(TD.p7 || []);
const listeningStats = validateListening(TD.listening);

// ---------- 摘要 ----------
console.log('\n--- 摘要 ---');
console.log(`tips: 共 ${TD.tips ? TD.tips.length : 0} 條 | ${Object.keys(tipsStats).map((p) => `${p}=${tipsStats[p]}`).join(', ')}`);
console.log(`plan: ${planStats.days} 天`);
console.log(`vocab: 共 ${vocabStats.total} 字（core=${vocabStats.core}, advanced=${vocabStats.advanced}）`);
console.log(`p5: 共 ${p5Stats.total} 題`);
console.log(`p6: 共 ${p6Stats.articles} 篇 / ${p6Stats.questions} 題`);
console.log(`p7: 共 ${p7Stats.total} 組（single=${p7Stats.single}, double=${p7Stats.double}, triple=${p7Stats.triple}）/ ${p7Stats.questions} 題`);
console.log(`listening: p1=${listeningStats.p1}, p2=${listeningStats.p2}, p3=${listeningStats.p3}, p4=${listeningStats.p4}`);

if (missingFiles.length > 0) {
  console.log('\n--- 缺少的資料檔（可能屬正常，尚未由內容工作流產出） ---');
  missingFiles.forEach((f) => console.log(`- data/${f}`));
}

if (errors.length > 0) {
  console.log(`\n--- 錯誤清單（共 ${errors.length} 筆） ---`);
  errors.forEach((e) => console.log(e));
  console.log(`\n驗證失敗：共 ${errors.length} 筆錯誤。`);
  process.exit(1);
} else {
  console.log('\n驗證通過：無錯誤。');
  process.exit(0);
}
