/**
 * js/tts.js — TOEIC 30 天衝刺平台
 * window.TTS：封裝 Web Speech API（speechSynthesis）。
 * 無 speechSynthesis 支援時，所有 API 安全 no-op 並回傳已 resolve 的 Promise。
 * 長文以句號等標點分段依序播放，避免 Chrome ~15 秒截斷 bug。
 */
(function (window) {
  'use strict';

  var FEMALE_HINTS = ['female', 'samantha', 'zira', 'google us english', 'victoria', 'karen', 'moira', 'tessa', 'susan'];
  var MALE_HINTS = ['male', 'david', 'daniel', 'alex', 'fred', 'george', 'james'];
  var VOICES_TIMEOUT_MS = 1000;
  var NO_ENGLISH_VOICE_HINT = '未偵測到英文語音，播放可能不標準；建議在作業系統安裝英文語音' +
    '（Windows：設定 → 時間與語言 → 語音 → 新增語音 English (United States)；' +
    'macOS：系統設定 → 輔助使用 → 朗讀內容 → 系統聲音 → 管理聲音），或作答後閱讀逐字稿練習';

  function isSupported() {
    try {
      return typeof window !== 'undefined' &&
        typeof window.speechSynthesis !== 'undefined' &&
        window.speechSynthesis !== null;
    } catch (e) {
      return false;
    }
  }

  function filterEnglish(list) {
    return (list || []).filter(function (v) {
      return v && typeof v.lang === 'string' && v.lang.toLowerCase().indexOf('en') === 0;
    });
  }

  // 寬鬆比對：lang 只要含 'en'（不分大小寫，涵蓋 en_US、en-US 等分隔形式），
  // 用於嚴格前綴比對（filterEnglish）找不到任何英文語音時的退路。
  function looseEnglishMatch(v) {
    return !!(v && typeof v.lang === 'string' && v.lang.toLowerCase().indexOf('en') !== -1);
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

  function voices() {
    return allVoicesPromise().then(filterEnglish);
  }

  function hasEnglishVoice() {
    if (!isSupported()) return Promise.resolve(false);
    return allVoicesPromise().then(function (all) {
      if (filterEnglish(all).length > 0) return true;
      return (all || []).filter(looseEnglishMatch).length > 0;
    });
  }

  function pickVoice(gender) {
    return allVoicesPromise().then(function (all) {
      var list = filterEnglish(all);
      if (!list || list.length === 0) list = (all || []).filter(looseEnglishMatch);
      if (!list || list.length === 0) {
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
      var byEnUS = list.find(function (v) {
        return v.lang && v.lang.toLowerCase() === 'en-us';
      });
      return byEnUS || list[0];
    });
  }

  function splitSentences(text) {
    if (!text) return [];
    var parts = String(text).match(/[^.!?]+[.!?]*(\s+|$)/g);
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
        // 即使沒有指定 voice，也明確設定 lang，讓瀏覽器依 lang 挑選英文語音，
        // 避免退回系統預設（可能是中文等非英文）語音朗讀英文文字。
        utter.lang = 'en-US';
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
    var chunks = splitSentences(text);
    if (chunks.length === 0) return Promise.resolve();

    if (opts.voice) {
      return speakChunks(chunks, { rate: rate, voice: opts.voice });
    }
    return pickVoice(opts.gender || null).then(function (voice) {
      return speakChunks(chunks, { rate: rate, voice: voice });
    });
  }

  function speakSequence(items) {
    if (!isSupported() || !Array.isArray(items) || items.length === 0) return Promise.resolve();
    return items.reduce(function (chain, item) {
      return chain.then(function () {
        return speak(item.text, { rate: item.rate, voice: item.voice, gender: item.gender }).then(function () {
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
    speak: speak,
    speakSequence: speakSequence,
    stop: stop,
    pickVoice: pickVoice,
    NO_ENGLISH_VOICE_HINT: NO_ENGLISH_VOICE_HINT
  };
})(typeof window !== 'undefined' ? window : globalThis);
