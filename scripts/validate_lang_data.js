#!/usr/bin/env node
'use strict';
// scripts/validate_lang_data.js
// 驗證日語 / 西班牙語的教材資料（data/ja_*.js、data/es_*.js）。
// 用法：node scripts/validate_lang_data.js
//
// 為什麼獨立成一支而不是併進 validate_data.js：
// TOEIC 的資料掛在 window.TOEIC_DATA，日西掛在 window.LANG_DATA，schema 也完全不同。
// 分開比較好維護，兩支都會在 README 的驗證步驟裡列出來。

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

const FILES = [
  'ja_kana.js', 'ja_vocab_1.js', 'ja_grammar.js', 'ja_quiz_bank.js',
  'es_sounds.js', 'es_verbs.js', 'es_vocab_1.js', 'es_phrases.js'
];

const errors = [];
const missingFiles = [];

function err(file, id, msg) {
  errors.push(`[${file}] [${id}] ${msg}`);
}
function isStr(v) {
  return typeof v === 'string' && v.trim().length > 0;
}
function isInt(v) {
  return Number.isInteger(v);
}

// ---------- 載入 ----------
const sandbox = { window: {}, console };
vm.createContext(sandbox);

console.log('=== 日語 / 西班牙語資料驗證 ===\n');

for (const fname of FILES) {
  const fpath = path.join(DATA_DIR, fname);
  if (!fs.existsSync(fpath)) {
    console.log(`MISSING data/${fname}`);
    missingFiles.push(fname);
    continue;
  }
  try {
    vm.runInContext(fs.readFileSync(fpath, 'utf8'), sandbox, { filename: fpath });
  } catch (e) {
    err(`data/${fname}`, '-', `載入失敗: ${e.message}`);
  }
}

const LD = sandbox.window.LANG_DATA || {};
const JA = LD.ja || {};
const ES = LD.es || {};

// ---------- 共用：id 唯一性（跨全部語言，因為都存在同一個 cards 表裡靠前綴區分）----------
const allIds = new Map();
function checkId(id, file, label) {
  if (!isStr(id)) {
    err(file, label, '缺少 id');
    return;
  }
  if (allIds.has(id)) {
    err(file, label, `id 重複: ${id}（已出現在 ${allIds.get(id)}）`);
    return;
  }
  allIds.set(id, file);
}

// ---------- 日語 ----------

// 只允許日文字元（平假名/片假名/漢字/全形標點/長音符），用來擋生成過程混入的雜訊字元
const JP_OK = /^[぀-ゟ゠-ヿ一-鿿　-〿0-9０-９ーｰ、。！？「」・～]+$/;
const ROMAJI_OK = /^[a-z]+$/;

function validateJaKana(kana) {
  const file = 'data/ja_kana.js';
  const types = { seion: 0, dakuon: 0, handakuon: 0, youon: 0 };
  const KNOWN_TYPES = new Set(Object.keys(types));

  if (!Array.isArray(kana) || kana.length < 100) {
    err(file, 'kana', `五十音需至少 100 音，實際 ${kana ? kana.length : 0}`);
    return types;
  }
  kana.forEach((k, i) => {
    const label = k && k.id ? k.id : `kana#${i}`;
    checkId(k.id, file, label);
    if (!isStr(k.h) || !JP_OK.test(k.h)) err(file, label, `平假名欄位有問題: ${k.h}`);
    if (!isStr(k.k) || !JP_OK.test(k.k)) err(file, label, `片假名欄位有問題: ${k.k}`);
    if (!isStr(k.romaji) || !ROMAJI_OK.test(k.romaji)) err(file, label, `romaji 只能是小寫英文字母: ${k.romaji}`);
    if (!KNOWN_TYPES.has(k.type)) err(file, label, `type 值域錯誤: ${k.type}`);
    else types[k.type]++;
    if (!isStr(k.row)) err(file, label, '缺少 row');
  });

  // 五十音的組成是固定的事實，數量不對代表資料有缺漏
  if (types.seion !== 46) err(file, 'kana', `清音應為 46 音，實際 ${types.seion}`);
  if (types.dakuon !== 20) err(file, 'kana', `濁音應為 20 音，實際 ${types.dakuon}`);
  if (types.handakuon !== 5) err(file, 'kana', `半濁音應為 5 音，實際 ${types.handakuon}`);
  if (types.youon !== 33) err(file, 'kana', `拗音應為 33 音，實際 ${types.youon}`);
  return types;
}

function validateJaVocab(vocab) {
  const file = 'data/ja_vocab_1.js';
  if (!Array.isArray(vocab) || !vocab.length) {
    err(file, 'vocab', '缺少單字資料');
    return 0;
  }
  const POS = new Set(['n', 'v', 'i-adj', 'na-adj', 'adv', 'pron', 'num', 'exp']);
  vocab.forEach((v, i) => {
    const label = v && v.id ? v.id : `vocab#${i}`;
    checkId(v.id, file, label);
    ['w', 'kana', 'romaji', 'zh', 'ex', 'exKana', 'exZh', 'topic'].forEach((f) => {
      if (!isStr(v[f])) err(file, label, `缺少 ${f}`);
    });
    if (!POS.has(v.pos)) err(file, label, `pos 值域錯誤: ${v.pos}`);
    // 日文欄位不得混入拉丁字母、西里爾字母等雜訊
    ['w', 'kana', 'ex', 'exKana'].forEach((f) => {
      if (isStr(v[f]) && !JP_OK.test(v[f])) err(file, label, `${f} 含非日文字元: ${v[f]}`);
    });
    if (isStr(v.romaji) && !/^[a-z\s]+$/.test(v.romaji)) {
      err(file, label, `romaji 含非法字元: ${v.romaji}`);
    }
  });
  return vocab.length;
}

function validateJaGrammar(grammar, steps) {
  const file = 'data/ja_grammar.js';
  if (!Array.isArray(grammar) || grammar.length < 20) {
    err(file, 'grammar', `文法需至少 20 條，實際 ${grammar ? grammar.length : 0}`);
    return 0;
  }
  const STEPS = new Set((steps || []).map((s) => s.code));
  grammar.forEach((g, i) => {
    const label = g && g.id ? g.id : `grammar#${i}`;
    checkId(g.id, file, label);
    ['title', 'pattern', 'meaning', 'note'].forEach((f) => {
      if (!isStr(g[f])) err(file, label, `缺少 ${f}`);
    });
    if (!STEPS.has(g.step)) err(file, label, `step 不在 grammarSteps 中: ${g.step}`);
    if (!Array.isArray(g.formation) || !g.formation.length) err(file, label, 'formation 不可為空');
    if (!Array.isArray(g.examples) || !g.examples.length) err(file, label, 'examples 不可為空');
    else {
      g.examples.forEach((ex, j) => {
        ['ja', 'kana', 'zh'].forEach((f) => {
          if (!isStr(ex[f])) err(file, `${label}-ex${j}`, `例句缺少 ${f}`);
        });
        if (isStr(ex.kana) && !JP_OK.test(ex.kana)) {
          err(file, `${label}-ex${j}`, `kana 含非日文字元: ${ex.kana}`);
        }
      });
    }
  });
  return grammar.length;
}

function validateJaParticle(bank) {
  const file = 'data/ja_quiz_bank.js';
  if (!Array.isArray(bank) || bank.length < 10) {
    err(file, 'particleQuiz', `助詞題需至少 10 題，實際 ${bank ? bank.length : 0}`);
    return 0;
  }
  bank.forEach((q, i) => {
    const label = q && q.id ? q.id : `particle#${i}`;
    checkId(q.id, file, label);
    ['sentence', 'kana', 'zh', 'why'].forEach((f) => {
      if (!isStr(q[f])) err(file, label, `缺少 ${f}`);
    });
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      err(file, label, `options 需 4 個，實際 ${q.options && q.options.length}`);
    }
    if (!isInt(q.answer) || q.answer < 0 || q.answer >= (q.options || []).length) {
      err(file, label, `answer 越界: ${q.answer}`);
    }
    if (new Set(q.options || []).size !== (q.options || []).length) {
      err(file, label, 'options 有重複選項');
    }
    // 題目一定要有挖空記號，否則使用者不知道要填哪裡
    if (isStr(q.sentence) && q.sentence.indexOf('＿') === -1) {
      err(file, label, 'sentence 缺少挖空記號 ＿');
    }
  });
  return bank.length;
}

// ---------- 西班牙語 ----------

function validateEsSounds(sounds, groups) {
  const file = 'data/es_sounds.js';
  if (!Array.isArray(sounds) || sounds.length < 15) {
    err(file, 'sounds', `發音規則需至少 15 條，實際 ${sounds ? sounds.length : 0}`);
    return 0;
  }
  const GROUPS = new Set((groups || []).map((g) => g.code));
  sounds.forEach((s, i) => {
    const label = s && s.id ? s.id : `sound#${i}`;
    checkId(s.id, file, label);
    ['title', 'rule'].forEach((f) => {
      if (!isStr(s[f])) err(file, label, `缺少 ${f}`);
    });
    if (!GROUPS.has(s.group)) err(file, label, `group 不在 soundGroups 中: ${s.group}`);
    if (!Array.isArray(s.examples) || !s.examples.length) err(file, label, 'examples 不可為空');
    else {
      s.examples.forEach((ex, j) => {
        if (!isStr(ex.es)) err(file, `${label}-ex${j}`, '例字缺少 es');
        if (!isStr(ex.zh)) err(file, `${label}-ex${j}`, '例字缺少 zh');
      });
    }
  });
  return sounds.length;
}

function validateEsVerbs(verbs, types, persons) {
  const file = 'data/es_verbs.js';
  if (!Array.isArray(verbs) || verbs.length < 15) {
    err(file, 'verbs', `動詞需至少 15 個，實際 ${verbs ? verbs.length : 0}`);
    return 0;
  }
  if (!Array.isArray(persons) || persons.length !== 6) {
    err(file, 'persons', `persons 需 6 個人稱，實際 ${persons ? persons.length : 0}`);
  }
  const TYPES = new Set((types || []).map((t) => t.code));
  verbs.forEach((v, i) => {
    const label = v && v.id ? v.id : `verb#${i}`;
    checkId(v.id, file, label);
    ['inf', 'zh', 'note'].forEach((f) => {
      if (!isStr(v[f])) err(file, label, `缺少 ${f}`);
    });
    if (!TYPES.has(v.type)) err(file, label, `type 不在 verbTypes 中: ${v.type}`);
    if (!Array.isArray(v.forms) || v.forms.length !== 6) {
      err(file, label, `forms 需正好 6 個變位，實際 ${v.forms && v.forms.length}`);
    } else {
      v.forms.forEach((f, j) => {
        if (!isStr(f)) err(file, label, `第 ${j} 個變位是空的`);
      });
      // 規則動詞的字尾必須真的符合宣告的規則，否則教材自相矛盾
      if (v.type === 'ar' && v.forms[3] !== v.inf.replace(/ar$/, 'amos')) {
        err(file, label, `宣告為 -ar 規則，但 nosotros 應為 ${v.inf.replace(/ar$/, 'amos')}，實際 ${v.forms[3]}`);
      }
      if (v.type === 'er' && v.forms[3] !== v.inf.replace(/er$/, 'emos')) {
        err(file, label, `宣告為 -er 規則，但 nosotros 應為 ${v.inf.replace(/er$/, 'emos')}，實際 ${v.forms[3]}`);
      }
      if (v.type === 'ir' && v.forms[3] !== v.inf.replace(/ir$/, 'imos')) {
        err(file, label, `宣告為 -ir 規則，但 nosotros 應為 ${v.inf.replace(/ir$/, 'imos')}，實際 ${v.forms[3]}`);
      }
    }
    if (!isStr(v.ex) || !isStr(v.exZh)) err(file, label, '缺少例句 ex / exZh');
  });
  return verbs.length;
}

function validateEsVocab(vocab, topics) {
  const file = 'data/es_vocab_1.js';
  if (!Array.isArray(vocab) || !vocab.length) {
    err(file, 'vocab', '缺少單字資料');
    return 0;
  }
  const TOPICS = new Set((topics || []).map((t) => t.code));
  vocab.forEach((v, i) => {
    const label = v && v.id ? v.id : `vocab#${i}`;
    checkId(v.id, file, label);
    ['w', 'base', 'zh', 'pos', 'ex', 'exZh'].forEach((f) => {
      if (!isStr(v[f])) err(file, label, `缺少 ${f}`);
    });
    if (!TOPICS.has(v.topic)) err(file, label, `topic 不在 vocabTopics 中: ${v.topic}`);
    if (v.pos === 'n') {
      // 名詞必須標陰陽性，而且 w 要含冠詞 —— 這是本模組刻意的教學規定
      if (v.gender !== 'm' && v.gender !== 'f') err(file, label, `名詞缺少 gender（m/f）: ${v.gender}`);
      if (!/^(el|la|los|las) /.test(v.w)) err(file, label, `名詞的 w 需含定冠詞: ${v.w}`);
    }
  });
  return vocab.length;
}

function validateEsPhrases(phrases, groups) {
  const file = 'data/es_phrases.js';
  if (!Array.isArray(phrases) || phrases.length < 20) {
    err(file, 'phrases', `句型需至少 20 條，實際 ${phrases ? phrases.length : 0}`);
    return 0;
  }
  const GROUPS = new Set((groups || []).map((g) => g.code));
  phrases.forEach((p, i) => {
    const label = p && p.id ? p.id : `phrase#${i}`;
    checkId(p.id, file, label);
    if (!isStr(p.es)) err(file, label, '缺少 es');
    if (!isStr(p.zh)) err(file, label, '缺少 zh');
    if (!GROUPS.has(p.group)) err(file, label, `group 不在 phraseGroups 中: ${p.group}`);
  });
  return phrases.length;
}

// ---------- 執行 ----------
const kanaStats = validateJaKana(JA.kana);
const jaVocabCount = validateJaVocab(JA.vocab);
const jaGrammarCount = validateJaGrammar(JA.grammar, JA.grammarSteps);
const jaParticleCount = validateJaParticle(JA.particleQuiz);

const esSoundCount = validateEsSounds(ES.sounds, ES.soundGroups);
const esVerbCount = validateEsVerbs(ES.verbs, ES.verbTypes, ES.persons);
const esVocabCount = validateEsVocab(ES.vocab, ES.vocabTopics);
const esPhraseCount = validateEsPhrases(ES.phrases, ES.phraseGroups);

// ---------- 摘要 ----------
console.log('--- 日語 ---');
console.log(`五十音: 共 ${(JA.kana || []).length} 音（清音 ${kanaStats.seion} / 濁音 ${kanaStats.dakuon} / 半濁音 ${kanaStats.handakuon} / 拗音 ${kanaStats.youon}）`);
console.log(`N5 單字: ${jaVocabCount} 個`);
console.log(`N5 文法: ${jaGrammarCount} 條`);
console.log(`助詞題庫: ${jaParticleCount} 題`);

console.log('\n--- 西班牙語 ---');
console.log(`發音規則: ${esSoundCount} 條`);
console.log(`動詞: ${esVerbCount} 個（變位卡 ${esVerbCount * 6} 張）`);
console.log(`A1 單字: ${esVocabCount} 個`);
console.log(`常用句型: ${esPhraseCount} 條`);

console.log(`\n可 SRS 的學習項目 id 總數: ${allIds.size}`);

if (missingFiles.length > 0) {
  console.log('\n--- 缺少的資料檔 ---');
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
