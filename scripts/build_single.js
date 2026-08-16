#!/usr/bin/env node
'use strict';
// scripts/build_single.js
// 讀 index.html，依其中 <link rel=stylesheet> 與 <script src> 的順序，
// 把 css/*.css、data/*.js、js/**/*.js 內容 inline 進去，輸出到 dist/：
//   1. dist/toeic30.html          — 完整獨立 HTML（可雙擊開啟 / 傳到手機開啟）
//   2. dist/toeic30.fragment.html — 片段版（無 DOCTYPE/html/head/body，供嵌入既有骨架）
// 用法： node scripts/build_single.js [產生時間 ISO 字串，預設 new Date().toISOString()]

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'index.html');
const DIST_DIR = path.join(ROOT, 'dist');
const FULL_OUT_PATH = path.join(DIST_DIR, 'toeic30.html');
const FRAGMENT_OUT_PATH = path.join(DIST_DIR, 'toeic30.fragment.html');

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB 警告門檻

// 依 CLI 參數或當下時間決定產生時間戳記
const GENERATED_AT = process.argv[2] || new Date().toISOString();

// 累積被 inline 的來源檔清單（依實際讀取順序）
const sourceFiles = [];

function readSource(relHref) {
  const abs = path.join(ROOT, relHref);
  return fs.readFileSync(abs, 'utf8');
}

function recordSourceFile(relHref, text) {
  sourceFiles.push({ rel: relHref, bytes: Buffer.byteLength(text, 'utf8') });
}

// ---------- 掃描 <link rel="stylesheet"> / <script src="..."> ----------

function findStylesheetLinks(html) {
  const linkTagRe = /<link\b[^>]*>/gi;
  const results = [];
  let m;
  while ((m = linkTagRe.exec(html))) {
    const tag = m[0];
    if (!/rel\s*=\s*["']stylesheet["']/i.test(tag)) continue;
    const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    results.push({ tag, href: hrefMatch[1], index: m.index });
  }
  return results;
}

function findScriptTags(html) {
  const scriptTagRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const results = [];
  let m;
  while ((m = scriptTagRe.exec(html))) {
    const attrs = m[1];
    const inner = m[2];
    const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) continue; // 本專案 index.html 內所有 <script> 皆為外部檔案，無內嵌內容
    if (inner.trim().length > 0) {
      console.warn(`警告：<script src="${srcMatch[1]}"> 標籤內含非預期的內嵌內容，將被捨棄`);
    }
    results.push({ tag: m[0], src: srcMatch[1], index: m.index });
  }
  return results;
}

// ---------- inline 內容處理 ----------

function escapeScriptContent(js) {
  // </script> 字串需跳脫，避免提早關閉外層 <script> 標籤
  return js.replace(/<\/script/gi, '<\\/script');
}

function warnIfLocalCssUrl(cssText, cssHref) {
  const urlRe = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  let m;
  while ((m = urlRe.exec(cssText))) {
    const ref = m[2];
    if (/^(data:|https?:|\/\/)/i.test(ref)) continue; // data URI / 外部 URL 不需 inline，略過
    console.warn(`警告：${cssHref} 內含本地檔案 url() 引用 "${ref}"，此打包器不會 inline 該資源，打包後可能失效`);
  }
}

function buildStyleReplacement(href) {
  const text = readSource(href);
  recordSourceFile(href, text);
  warnIfLocalCssUrl(text, href);
  return `<style>\n/* ${href} */\n${text}\n</style>`;
}

function buildScriptReplacement(src) {
  const text = readSource(src);
  recordSourceFile(src, text);
  return `<script>\n/* ${src} */\n${escapeScriptContent(text)}\n</script>`;
}

// 將 html 內所有 stylesheet link 與 script src 標籤原地替換為 inline 版本
// （依標籤在原始檔中的出現順序讀取來源檔，再由後往前替換字串，避免位移影響尚未處理的 index）
function inlineAssets(html) {
  const links = findStylesheetLinks(html);
  const scripts = findScriptTags(html);

  const replacements = [
    ...links.map((l) => ({ index: l.index, length: l.tag.length, replacement: buildStyleReplacement(l.href) })),
    ...scripts.map((s) => ({ index: s.index, length: s.tag.length, replacement: buildScriptReplacement(s.src) })),
  ].sort((a, b) => a.index - b.index);

  let out = '';
  let cursor = 0;
  for (const r of replacements) {
    out += html.slice(cursor, r.index) + r.replacement;
    cursor = r.index + r.length;
  }
  out += html.slice(cursor);
  return out;
}

// ---------- 標頭註解 ----------

function formatKB(bytes) {
  return (bytes / 1024).toFixed(1);
}

function buildHeaderComment() {
  const totalBytes = sourceFiles.reduce((sum, f) => sum + f.bytes, 0);
  const lines = [
    '<!--',
    '  此檔案由 scripts/build_single.js 自動產生，請勿手動修改。',
    `  產生時間: ${GENERATED_AT}`,
    `  來源檔案（依載入順序，共 ${sourceFiles.length} 個，總計 ${formatKB(totalBytes)} KB）:`,
    ...sourceFiles.map((f) => `    - ${f.rel} (${formatKB(f.bytes)} KB)`),
    '-->',
  ];
  return lines.join('\n');
}

// ---------- 從已 inline 的完整 HTML 萃取片段版所需區塊 ----------

function extractTagContent(html, tagName) {
  const re = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const m = html.match(re);
  return m ? m[1] : '';
}

function buildFragment(fullHtmlNoHeader, headerComment) {
  const headContent = extractTagContent(fullHtmlNoHeader, 'head');
  const bodyContent = extractTagContent(fullHtmlNoHeader, 'body');

  const titleMatch = headContent.match(/<title>[\s\S]*?<\/title>/i);
  const titleTag = titleMatch ? titleMatch[0] : '<title></title>';

  const styleTags = headContent.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || [];

  return [headerComment, titleTag, styleTags.join('\n'), bodyContent.trim()].join('\n\n') + '\n';
}

// ---------- 主流程 ----------

function main() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`找不到 ${path.relative(ROOT, INDEX_PATH)}`);
    process.exit(1);
  }

  const rawHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  const transformed = inlineAssets(rawHtml); // 副作用：填入 sourceFiles

  const headerComment = buildHeaderComment();

  // 完整獨立版：在 <!DOCTYPE html> 之後、<html ...> 之前插入註解，
  // 其餘（DOCTYPE / html lang / head / meta viewport / title / favicon）原樣保留
  const doctypeRe = /(<!DOCTYPE\s+html>\s*)/i;
  const fullHtml = doctypeRe.test(transformed)
    ? transformed.replace(doctypeRe, `$1${headerComment}\n`)
    : `${headerComment}\n${transformed}`;

  // 片段版：從已 inline 的內容萃取 title / style / body（body 內原本就以
  // <script> 結尾，inline 後順序自然是 title → style → body 標記 → script）
  const fragmentHtml = buildFragment(transformed, headerComment);

  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.writeFileSync(FULL_OUT_PATH, fullHtml, 'utf8');
  fs.writeFileSync(FRAGMENT_OUT_PATH, fragmentHtml, 'utf8');

  console.log('=== TOEIC30 單檔打包 ===\n');
  console.log(`來源檔案（依載入順序，共 ${sourceFiles.length} 個）:`);
  sourceFiles.forEach((f) => console.log(`  - ${f.rel} (${formatKB(f.bytes)} KB)`));

  [
    { label: 'dist/toeic30.html', abs: FULL_OUT_PATH },
    { label: 'dist/toeic30.fragment.html', abs: FRAGMENT_OUT_PATH },
  ].forEach(({ label, abs }) => {
    const size = fs.statSync(abs).size;
    console.log(`\n${label}: ${formatKB(size)} KB`);
    if (size > MAX_SIZE_BYTES) {
      console.warn(`警告：${label} 大小 ${formatKB(size)} KB 超過 15MB 門檻`);
    }
  });

  console.log('\n完成。');
}

main();
