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
   * 弾けさせる。
   * @param x,y     発生中心（canvas座標）
   * @param count   粒数
   * @param imgKey  使う品種スプライト
   * @param power   勢い（大きいほど派手に飛ぶ）
   */
  burst(x, y, count, imgKey, power = 1) {
    const img = this.images[imgKey] || null;
    for (let i = 0; i < count; i++) {
      const p = this._take();
      // 上向きの噴水状に飛ばす（中央のお題に被りにくく、ポップコーン機っぽい）
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;   // 真上±約43°
      const spd = (200 + Math.random() * 220) * power;
      p.on = true;
      p.x = x + (Math.random() - 0.5) * 16;
      p.y = y + (Math.random() - 0.5) * 10;
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd;                 // 上方向へ噴き上げ
      p.rot = Math.random() * Math.PI * 2;
      p.vrot = (Math.random() - 0.5) * 14;
      p.scale = (0.16 + Math.random() * 0.16) * (0.8 + power * 0.4);
      p.pop = 0;                  // 0→1 へ膨らむ演出用
      p.alpha = 1;
      p.maxLife = 0.6 + Math.random() * 0.5;
      p.life = p.maxLife;
      p.img = img;
    }
  }

  update(dt) {
    const g = 900;             // 重力
    let n = 0;
    for (const p of this.pool) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.vy += g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      if (p.pop < 1) p.pop = Math.min(1, p.pop + dt * 8);   // 弾ける瞬間の膨張
      const t = p.life / p.maxLife;
      p.alpha = t < 0.35 ? t / 0.35 : 1;                    // 終盤フェードアウト
      n++;
    }
    this.active = n;
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    for (const p of this.pool) {
      if (!p.on || !p.img || !p.img.complete) continue;
      const pop = 0.6 + p.pop * 0.4;        // 出現時に少し小さく→ぽんっ
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
  }
}

// ────────────────────────────────────────────────
//  サウンド
// ────────────────────────────────────────────────
class AudioKit {
  constructor() {
    this.muted = false;
    this.sePool = {};   // key -> Audio[]（多重再生用）
    this.bgm = null;
    this.poolSize = 6;
    this.unlocked = false;
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

  loadBGM(url) {
    this.bgm = new Audio(url);
    this.bgm.loop = true;
    this.bgm.volume = 0.35;
    this.bgm.preload = 'auto';
  }

  /** 初回ユーザー操作で再生をアンロック（自動再生ポリシー対策） */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.bgm && !this.muted) this.bgm.play().catch(() => {});
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
    if (this.bgm) {
      if (this.muted) this.bgm.pause();
      else if (this.unlocked) this.bgm.play().catch(() => {});
    }
    return this.muted;
  }
}

window.FX = { ParticleSystem, AudioKit };
