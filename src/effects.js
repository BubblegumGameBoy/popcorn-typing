/* Audio playback. ParticleSystem is supplied by particles.js. */
class AudioKit {
  constructor() {
    this.muted = false;
    this.sePool = {};      // key -> Audio[]（多重再生用）
    this.bgmUrls = {};     // key -> url
    this.bgmKey = null;    // いま鳴らしているトラック
    this.bgmVol = 0.32;
    this.poolSize = 10;
    this.unlocked = false;
    this.XFADE = 1.4;      // クロスフェード秒
    // 現トラックは2枚使い（a/b）。末尾で重ねてループの繋ぎ目を消す。
    this.a = null; this.b = null; this.active = null;
    this.looping = false;
    this.fades = [];       // {el, from, to, t, dur, onEnd}
    setInterval(() => this._tick(), 50);
  }

  loadSE(key, url) {
    const arr = [];
    for (let i = 0; i < this.poolSize; i++) {
      const a = new Audio(url);
      a.preload = 'auto';
      a.volume = 0.6;
      arr.push(a);
    }
    this.sePool[key] = { arr, i: 0 };
  }

  /** BGMトラックを登録（URLだけ覚えておく） */
  loadBGM(key, url) { this.bgmUrls[key] = url; }

  _mkBgm(url) {
    const a = new Audio(url);
    a.preload = 'auto';
    a.loop = false;        // ループは自前のクロスフェードで行う
    a.volume = 0;
    return a;
  }
  _fade(el, from, to, dur, onEnd) {
    if (!el) return;
    this.fades = this.fades.filter(f => f.el !== el);
    try { el.volume = this.muted ? 0 : Math.max(0, Math.min(1, from)); } catch (e) {}
    this.fades.push({ el, from, to, t: 0, dur, onEnd });
  }

  /** フェーズ等でBGMを切り替える（クロスフェード）。 */
  playBGM(key) {
    if (this.bgmKey === key) return;
    this.bgmKey = key;
    // 旧トラックをフェードアウト
    const oldA = this.a, oldB = this.b;
    if (oldA) this._fade(oldA, oldA.volume, 0, this.XFADE, () => { try { oldA.pause(); } catch (e) {} });
    if (oldB) this._fade(oldB, oldB.volume, 0, this.XFADE, () => { try { oldB.pause(); } catch (e) {} });
    // 新トラックを2枚用意してフェードイン
    const url = this.bgmUrls[key];
    this.a = this._mkBgm(url); this.b = this._mkBgm(url);
    this.active = this.a; this.looping = false;
    if (this.unlocked && !this.muted) {
      try { this.a.currentTime = 0; this.a.play().catch(() => {}); } catch (e) {}
      this._fade(this.a, 0, this.bgmVol, this.XFADE);
    }
  }

  /** 初回ユーザー操作で再生をアンロック */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.active && !this.muted) {
      try { this.active.currentTime = 0; this.active.play().catch(() => {}); } catch (e) {}
      this._fade(this.active, 0, this.bgmVol, this.XFADE);
    }
  }

  _tick() {
    const dt = 0.05;
    // 音量フェード
    for (let i = this.fades.length - 1; i >= 0; i--) {
      const f = this.fades[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      const v = f.from + (f.to - f.from) * k;
      try { f.el.volume = this.muted ? 0 : Math.max(0, Math.min(1, v)); } catch (e) {}
      if (k >= 1) { if (f.onEnd) f.onEnd(); this.fades.splice(i, 1); }
    }
    // ループの繋ぎ目を消す：末尾 XFADE 秒前に もう1枚を頭から重ねる
    if (this.active && this.unlocked && !this.muted && !this.looping) {
      const a = this.active, dur = a.duration;
      if (dur && isFinite(dur) && a.currentTime >= dur - this.XFADE) {
        this.looping = true;
        const other = (a === this.a) ? this.b : this.a;
        try { other.currentTime = 0; other.play().catch(() => {}); } catch (e) {}
        this._fade(other, 0, this.bgmVol, this.XFADE);
        this._fade(a, a.volume, 0, this.XFADE, () => { try { a.pause(); } catch (e) {} });
        this.active = other;
        setTimeout(() => { this.looping = false; }, this.XFADE * 1000 + 80);
      }
    }
  }

  /** 効果音再生。rate でピッチを揺らして連打を気持ちよく。 */
  play(key, rate = 1, vol = 0.6) {
    if (this.muted) return;
    const pool = this.sePool[key];
    if (!pool) return;
    // 空いている要素（再生終了/未再生）を優先して掴む。
    //   ※ pause()→play() を即座に繰り返すと Chrome 等で
    //     「play() request was interrupted by a call to pause()」が出て
    //     その打鍵だけ無音になるため、pause() は使わない。
    let a = null;
    for (let n = 0; n < pool.arr.length; n++) {
      const cand = pool.arr[(pool.i + n) % pool.arr.length];
      if (cand.paused || cand.ended) {
        a = cand;
        pool.i = (pool.i + n + 1) % pool.arr.length;
        break;
      }
    }
    // 全部まだ再生中なら、いちばん古いものを頭出しして使い回す
    if (!a) { a = pool.arr[pool.i]; pool.i = (pool.i + 1) % pool.arr.length; }
    try {
      a.currentTime = 0;
      a.preservesPitch = true;
      a.playbackRate = rate;
      a.volume = vol;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* noop */ }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      try { if (this.a) this.a.pause(); if (this.b) this.b.pause(); } catch (e) {}
    } else if (this.unlocked && this.active) {
      try { this.active.play().catch(() => {}); this.active.volume = this.bgmVol; } catch (e) {}
    }
    return this.muted;
  }
}

window.FX = { ParticleSystem, AudioKit };
