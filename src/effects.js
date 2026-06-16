/*
 * ============================================================
 *  エフェクト＆サウンド  (effects.js)
 * ============================================================
 *  ★「ポンッ！」の気持ちよさを担当する★
 *
 *  - ParticleSystem : Canvas でポップコーンの粒を弾けさせる。
 *      オブジェクトプールで使い回すので、何粒稼ごうが描画は一定負荷。
 *      （スコアは別管理。粒は"見た目だけ"＝最大数に上限。）
 *  - AudioKit       : 効果音/BGM。連打でも詰まらないよう多重再生プール。
 * ============================================================
 */

// ────────────────────────────────────────────────
//  パーティクル（弾ける粒）
// ────────────────────────────────────────────────
class ParticleSystem {
  constructor(canvas, images, max) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = images;       // {key: HTMLImageElement}
    this.max = max;
    this.pool = [];
    this.cursor = 0;            // リングバッファの先頭（上限到達時は古いものを再利用）
    this.active = 0;
    for (let i = 0; i < max; i++) {
      this.pool.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vrot: 0,
                       scale: 1, alpha: 1, life: 0, maxLife: 1, img: null });
    }
    this.flashes = [];   // 破裂の光（中心でパッと光る）
    this.texts = [];     // 浮かぶ「+N」数字
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = r.width * dpr;
    this.canvas.height = r.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = r.width;
    this.h = r.height;
  }

  _take() {
    // 空きを探す。無ければリングで古いものを奪う（上限を守る）
    for (let i = 0; i < this.max; i++) {
      const idx = (this.cursor + i) % this.max;
      if (!this.pool[idx].on) { this.cursor = (idx + 1) % this.max; return this.pool[idx]; }
    }
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.max;
    return p;
  }

  /**
   * 花火のように“破裂”させる。中心がパッと光り、粒が全方向（上下左右）へ飛び散る。
   * @param x,y     破裂中心（canvas座標）
   * @param count   粒数
   * @param imgKey  使う品種スプライト
   * @param power   勢い（大きいほど派手に飛ぶ）
   */
  burst(x, y, count, imgKey, power = 1) {
    const img = this.images[imgKey] || null;
    // 中心の閃光
    this.flashes.push({ x, y, r: 6, maxR: 30 + 26 * power, life: 0.28, maxLife: 0.28 });
    if (this.flashes.length > 60) this.flashes.shift();
    for (let i = 0; i < count; i++) {
      const p = this._take();
      const ang = Math.random() * Math.PI * 2;          // ★全方向（上下左右）
      const spd = (140 + Math.random() * 230) * power;   // 中心から放射状に
      p.on = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd;
      p.rot = Math.random() * Math.PI * 2;
      p.vrot = (Math.random() - 0.5) * 16;
      p.scale = (0.16 + Math.random() * 0.16) * (0.8 + power * 0.4);
      p.pop = 0;
      p.alpha = 1;
      p.maxLife = 0.7 + Math.random() * 0.6;
      p.life = p.maxLife;
      p.img = img;
    }
  }

  /** 上からポップコーンが落ちてくる（施設からの生産演出。閃光なし）。 */
  drop(x, y, count, imgKey) {
    const img = this.images[imgKey] || null;
    for (let i = 0; i < count; i++) {
      const p = this._take();
      p.on = true;
      p.x = x + (Math.random() - 0.5) * 34;
      p.y = y + (Math.random() - 0.5) * 10;
      p.vx = (Math.random() - 0.5) * 70;
      p.vy = 30 + Math.random() * 70;        // 下向き＝落ちる
      p.rot = Math.random() * Math.PI * 2;
      p.vrot = (Math.random() - 0.5) * 8;
      p.scale = 0.16 + Math.random() * 0.12;
      p.pop = 1;                              // すでに膨らんだ状態で落とす
      p.alpha = 1;
      p.maxLife = 1.3 + Math.random() * 0.9;
      p.life = p.maxLife;
      p.img = img;
    }
  }

  /** 浮かび上がる数字（「+N」など）。 */
  addText(x, y, text, color, size) {
    this.texts.push({ x, y, vy: -46, text, color: color || '#fff', size: size || 22, life: 0.9, maxLife: 0.9 });
    if (this.texts.length > 40) this.texts.shift();
  }

  update(dt) {
    const g = 760;             // 重力（花火が少し漂ってから落ちる）
    let n = 0;
    for (const p of this.pool) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.vx *= (1 - dt * 1.4);   // 空気抵抗で広がりが止まっていく（花火っぽさ）
      p.vy += g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      if (p.pop < 1) p.pop = Math.min(1, p.pop + dt * 9);
      const t = p.life / p.maxLife;
      p.alpha = t < 0.35 ? t / 0.35 : 1;
      n++;
    }
    this.active = n;
    // 閃光
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      if (f.life <= 0) { this.flashes.splice(i, 1); continue; }
      f.r += (f.maxR - f.r) * Math.min(1, dt * 12);
    }
    // 数字
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const tx = this.texts[i];
      tx.life -= dt;
      if (tx.life <= 0) { this.texts.splice(i, 1); continue; }
      tx.y += tx.vy * dt;
      tx.vy *= (1 - dt * 1.5);
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    // 1) 破裂の閃光（加算合成でまぶしく）
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.flashes) {
      const a = f.life / f.maxLife;
      const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      grd.addColorStop(0, `rgba(255,250,210,${0.9 * a})`);
      grd.addColorStop(0.5, `rgba(255,210,90,${0.5 * a})`);
      grd.addColorStop(1, 'rgba(255,180,40,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // 2) 粒
    for (const p of this.pool) {
      if (!p.on || !p.img || !p.img.complete) continue;
      const pop = 0.5 + p.pop * 0.5;        // 出現時に小さく→ぼんっと膨らむ
      const s = p.scale * pop;
      const iw = p.img.naturalWidth * s;
      const ih = p.img.naturalHeight * s;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.drawImage(p.img, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();
    }
    // 3) 浮かぶ数字（最前面）
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const tx of this.texts) {
      const a = Math.min(1, tx.life / tx.maxLife * 1.4);
      ctx.globalAlpha = a;
      ctx.font = `900 ${tx.size}px "Hiragino Maru Gothic ProN", system-ui, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeText(tx.text, tx.x, tx.y);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.text, tx.x, tx.y);
    }
    ctx.restore();
  }
}

// ────────────────────────────────────────────────
//  サウンド
// ────────────────────────────────────────────────
class AudioKit {
  constructor() {
    this.muted = false;
    this.sePool = {};      // key -> Audio[]（多重再生用）
    this.bgmUrls = {};     // key -> url
    this.bgmKey = null;    // いま鳴らしているトラック
    this.bgmVol = 0.32;
    this.poolSize = 6;
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
    const a = pool.arr[pool.i];
    pool.i = (pool.i + 1) % pool.arr.length;
    try {
      a.pause();
      a.currentTime = 0;
      a.playbackRate = rate;
      a.volume = vol;
      a.play().catch(() => {});
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
