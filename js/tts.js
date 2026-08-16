/**
 * js/tts.js — 多語言學習平台
 * window.TTS：封裝 Web Speech API（speechSynthesis）。
 * 無 speechSynthesis 支援時，所有 API 安全 no-op 並回傳已 resolve 的 Promise。
 * 長文以句號等標點分段依序播放，避免 Chrome ~15 秒截斷 bug。
 *
 * 多語言：所有 API 的 lang 參數皆為選填，省略時一律為 'en-US'，
 * 因此既有的 TOEIC 聽力呼叫端不需要任何改動。日語傳 'ja-JP'、西班牙語傳 'es-ES'。
 */
(function (window) {
  'use strict';

  var FEMALE_HINTS = ['female', 'samantha', 'zira', 'google us english', 'victoria', 'karen', 'moira', 'tessa', 'susan',
    'kyoko', 'haruka', 'nanami', 'sayaka', 'monica', 'paulina', 'helena', 'laura', 'elvira'];
  var MALE_HINTS = ['male', 'david', 'daniel', 'alex', 'fred', 'george', 'james',
    'otoya', 'ichiro', 'keita', 'jorge', 'pablo', 'diego', 'carlos'];
  var VOICES_TIMEOUT_MS = 1000;
  var DEFAULT_LANG = 'en-US';

  // 各語言在系統缺少語音時的安裝指引（key 為 BCP-47 前綴）
  var VOICE_HINTS = {
    en: '未偵測到英文語音，播放可能不標準；建議在作業系統安裝英文語音' +
      '（Windows：設定 → 時間與語言 → 語音 → 新增語音 English (United States)；' +
      'macOS：系統設定 → 輔助使用 → 朗讀內容 → 系統聲音 → 管理聲音），或作答後閱讀逐字稿練習',
    ja: '未偵測到日文語音，發音可能不正確；建議在作業系統安裝日文語音' +
      '（Windows：設定 → 時間與語言 → 語音 → 新增語音 日本語；' +
      'macOS：系統設定 → 輔助使用 → 朗讀內容 → 系統聲音 → 管理聲音 → 日本語），' +
      '未安裝前可依羅馬拼音自行讀出',
    es: '未偵測到西班牙文語音，發音可能不正確；建議在作業系統安裝西文語音' +
      '（Windows：設定 → 時間與語言 → 語音 → 新增語音 Español (España)；' +
      'macOS：系統設定 → 輔助使用 → 朗讀內容 → 系統聲音 → 管理聲音 → Español），' +
      '未安裝前可依發音規則自行讀出'
  };

  function isSupported() {
    try {
      return typeof window !== 'undefined' &&
        typeof window.speechSynthesis !== 'undefined' &&
        window.speechSynthesis !== null;
    } catch (e) {
      return false;
    }
  }

  /** 'ja-JP' → 'ja'；空值一律當英文 */
  function langPrefix(lang) {
    return String(lang || DEFAULT_LANG).toLowerCase().split(/[-_]/)[0];
  }

  /** 嚴格比對：voice.lang 以指定語言前綴開頭 */
  function filterByLang(list, lang) {
    var prefix = langPrefix(lang);
    return (list || []).filter(function (v) {
      return v && typeof v.lang === 'string' && v.lang.toLowerCase().indexOf(prefix) === 0;
    });
  }

  // 寬鬆比對：lang 只要含該前綴（不分大小寫，涵蓋 en_US、en-US 等分隔形式），
  // 用於嚴格前綴比對（filterByLang）找不到任何語音時的退路。
  function looseLangMatch(v, lang) {
    var prefix = langPrefix(lang);
    return !!(v && typeof v.lang === 'string' && v.lang.toLowerCase().indexOf(prefix) !== -1);
  }

  function filterEnglish(list) {
    return filterByLang(list, DEFAULT_LANG);
  }

  // 取得完整語音清單（不過濾語言），供 voices()/pickVoice()/hasEnglishVoice() 共用。
  function allVoicesPromise() {
    if (!isSupported()) return Promise.resolve([]);
    var synth = window.speechSynthesis;
    var existing = synth.getVoices() || [];
    if (existing.length > 0) return Promise.resolve(existing);

    return new Promise(function (resolve) {
      var resolved = false;
      var finish = function () {
        if (resolved) return;
        resolved = true;
        try {
          resolve(synth.getVoices() || []);
        } catch (e) {
          resolve([]);
        }
      };
      try {
        if (typeof synth.addEventListener === 'function') {
          var handler = function () {
            synth.removeEventListener('voiceschanged', handler);
            finish();
          };
          synth.addEventListener('voiceschanged', handler);
        } else {
          synth.onvoiceschanged = finish;
        }
      } catch (e) {
        // 忽略事件註冊失敗，靠 timeout 收尾
      }
      setTimeout(finish, VOICES_TIMEOUT_MS);
    });
  }

  /** voices(lang?) — 該語言可用的語音清單（省略 lang 時為英文，維持既有行為） */
  function voices(lang) {
    return allVoicesPromise().then(function (all) {
      return filterByLang(all, lang || DEFAULT_LANG);
    });
  }

  /** hasVoiceFor(lang) — 系統是否裝有該語言的語音 */
  function hasVoiceFor(lang) {
    if (!isSupported()) return Promise.resolve(false);
    var target = lang || DEFAULT_LANG;
    return allVoicesPromise().then(function (all) {
      if (filterByLang(all, target).length > 0) return true;
      return (all || []).filter(function (v) { return looseLangMatch(v, target); }).length > 0;
    });
  }

  function hasEnglishVoice() {
    return hasVoiceFor(DEFAULT_LANG);
  }

  /** voiceHintFor(lang) — 缺語音時要顯示給使用者的安裝指引 */
  function voiceHintFor(lang) {
    return VOICE_HINTS[langPrefix(lang)] || VOICE_HINTS.en;
  }

  function pickVoice(gender, lang) {
    var target = lang || DEFAULT_LANG;
    return allVoicesPromise().then(function (all) {
      var list = filterByLang(all, target);
      if (!list || list.length === 0) {
        list = (all || []).filter(function (v) { return looseLangMatch(v, target); });
      }
      if (!list || list.length === 0) {
        // 找不到該語言的語音時回傳 null，讓 speakOne 只靠 utter.lang 讓瀏覽器自行決定；
        // 硬塞系統預設語音（多半是中文）唸日文/西文反而更難聽懂。
        if (langPrefix(target) !== langPrefix(DEFAULT_LANG)) return null;
        var def = (all || []).filter(function (v) { return v && v.default; })[0];
        return def || null;
      }
      var hints = gender === 'female' ? FEMALE_HINTS : (gender === 'male' ? MALE_HINTS : null);
      var byHint = null;
      if (hints) {
        byHint = list.find(function (v) {
          var name = (v.name || '').toLowerCase();
          return hints.some(function (h) { return name.indexOf(h) !== -1; });
        }) || null;
      }
      if (byHint) return byHint;
      var exact = list.find(function (v) {
        return v.lang && v.lang.toLowerCase() === String(target).toLowerCase();
      });
      return exact || list[0];
    });
  }

  // 句尾標點同時涵蓋半形（英/西）與全形（日文）。西班牙文的 ¿¡ 是句首標點，
  // 不會誤切；日文沒有空白分隔，所以 (\s+|$) 改成可選的空白。
  var SENTENCE_RE = /[^.!?。！？]+[.!?。！？]*\s*/g;

  function splitSentences(text) {
    if (!text) return [];
    var parts = String(text).match(SENTENCE_RE);
    if (!parts) {
      var trimmed = String(text).trim();
      return trimmed ? [trimmed] : [];
    }
    return parts.map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
  }

  function speakOne(text, opts) {
    return new Promise(function (resolve) {
      try {
        var synth = window.speechSynthesis;
        var Utter = window.SpeechSynthesisUtterance;
        var utter = new Utter(text);
        // 即使沒有指定 voice，也明確設定 lang，讓瀏覽器依 lang 挑選對應語言的語音，
        // 避免退回系統預設（可能是中文）語音朗讀外語文字。
        utter.lang = (opts && opts.lang) || DEFAULT_LANG;
        utter.rate = (opts && typeof opts.rate === 'number') ? opts.rate : 1.0;
        if (opts && opts.voice) utter.voice = opts.voice;
        utter.onend = function () { resolve(); };
        utter.onerror = function () { resolve(); };
        synth.speak(utter);
      } catch (e) {
        resolve();
      }
    });
  }

  function speakChunks(chunks, opts) {
    return chunks.reduce(function (chain, chunk) {
      return chain.then(function () { return speakOne(chunk, opts); });
    }, Promise.resolve());
  }

  function speak(text, opts) {
    opts = opts || {};
    if (!isSupported() || !text) return Promise.resolve();
    var rate = typeof opts.rate === 'number' ? opts.rate : 1.0;
    var lang = opts.lang || DEFAULT_LANG;
    var chunks = splitSentences(text);
    if (chunks.length === 0) return Promise.resolve();

    if (opts.voice) {
      return speakChunks(chunks, { rate: rate, voice: opts.voice, lang: lang });
    }
    return pickVoice(opts.gender || null, lang).then(function (voice) {
      return speakChunks(chunks, { rate: rate, voice: voice, lang: lang });
    });
  }

  function speakSequence(items, seqOpts) {
    if (!isSupported() || !Array.isArray(items) || items.length === 0) return Promise.resolve();
    var seqLang = (seqOpts && seqOpts.lang) || null;
    return items.reduce(function (chain, item) {
      return chain.then(function () {
        return speak(item.text, {
          rate: item.rate, voice: item.voice, gender: item.gender,
          lang: item.lang || seqLang || DEFAULT_LANG
        }).then(function () {
          var pause = typeof item.pauseMs === 'number' ? item.pauseMs : 0;
          if (pause > 0) {
            return new Promise(function (resolve) { setTimeout(resolve, pause); });
          }
          return undefined;
        });
      });
    }, Promise.resolve());
  }

  function stop() {
    if (!isSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // no-op
    }
  }

  window.TTS = {
    isSupported: isSupported,
    voices: voices,
    hasEnglishVoice: hasEnglishVoice,
    hasVoiceFor: hasVoiceFor,
    voiceHintFor: voiceHintFor,
    speak: speak,
    speakSequence: speakSequence,
    stop: stop,
    pickVoice: pickVoice,
    langPrefix: langPrefix,
    DEFAULT_LANG: DEFAULT_LANG,
    NO_ENGLISH_VOICE_HINT: VOICE_HINTS.en
  };
})(typeof window !== 'undefined' ? window : globalThis);
