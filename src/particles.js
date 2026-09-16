/* Bounded airborne simulation + a separate, slowly fading popcorn pile.
   Visual kernels never change the economic score. All sizes are CSS pixels. */
class ParticleSystem {
  constructor(canvas, images, max, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = images;
    this.max = max;
    this.maxSettled = options.maxSettled || 1200;
    this.manualRetention = options.manualRetention || 45;
    this.autoRetention = options.autoRetention || 20;
    this.autoAirCap = options.autoAirCap || 120;
    this.pool = Array.from({ length: max }, () => ({ on: false }));
    this.pile = [];
    this.cursor = 0;
    this.active = 0;
    this.autoActive = 0;
    this.texts = [];
    this.flashes = [];
    this.sprites = new Map();
    this.layoutDirty = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const oldW = this.w || r.width;
    this.w = r.width; this.h = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.columns = Math.max(1, Math.ceil(this.w / 24));
    this.heights = new Float32Array(this.columns);
    for (const p of this.pool) if (p.on && oldW) p.x *= this.w / oldW;
    this.layoutPile(true);
  }

  // Prepare small reusable textures once. Atlas cropping happens only here,
  // never hundreds of full-resolution image resamples in the animation loop.
  sprite(key, variant) {
    const useAtlas = key === 'normal' && this.images.butterAtlas?.complete && this.images.butterAtlas.naturalWidth;
    const id = useAtlas ? `butter-${variant}` : key;
    if (this.sprites.has(id)) return this.sprites.get(id);
    const image = useAtlas ? this.images.butterAtlas : this.images[key];
    if (!image?.complete || !image.naturalWidth) return null;
    const texture = document.createElement('canvas');
    texture.width = texture.height = 96;
    const ctx = texture.getContext('2d');
    if (useAtlas) {
      const cw = image.naturalWidth / 2, ch = image.naturalHeight / 2;
      ctx.drawImage(image, (variant % 2) * cw, Math.floor(variant / 2) * ch, cw, ch, 0, 0, 96, 96);
    } else {
      const scale = 96 / Math.max(image.naturalWidth, image.naturalHeight);
      const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
      ctx.drawImage(image, (96 - w) / 2, (96 - h) / 2, w, h);
    }
    this.sprites.set(id, texture);
    return texture;
  }

  _take() {
    for (let i = 0; i < this.max; i++) {
      const index = (this.cursor + i) % this.max;
      if (!this.pool[index].on) { this.cursor = (index + 1) % this.max; return this.pool[index]; }
    }
    // Prefer recycling automation. A new machine puff cannot evict a hand-typed kernel.
    const p = this.pool.find(p => p.source === 'auto') || this.pool[this.cursor];
    if (p.source === 'manual') this.settle(p);
    else this.autoActive = Math.max(0, this.autoActive - 1);
    this.cursor = (this.cursor + 1) % this.max;
    return p;
  }

  emit(x, y, count, key, power, source, shape) {
    for (let i = 0; i < Math.min(count, this.max); i++) {
      if (source === 'auto' && this.autoActive >= this.autoAirCap) break;
      const p = this._take();
      const angle = Math.random() * Math.PI * 2;
      const speed = (160 + Math.random() * 200) * power;
      Object.assign(p, {
        on: true, source, key, variant: Math.floor(Math.random() * 4),
        x: Math.max(18, Math.min(this.w - 18, x + (Math.random() - .5) * 28)), y,
        vx: shape === 'burst' ? Math.cos(angle) * speed : (Math.random() - .5) * (source === 'auto' ? 110 : 380 * power),
        vy: source === 'auto' ? 30 + Math.random() * 65 : shape === 'burst' ? Math.sin(angle) * speed : -(220 + Math.random() * 170) * Math.sqrt(power),
        size: source === 'auto' ? 26 + Math.random() * 12 : 35 + Math.random() * 18,
        rot: Math.random() * Math.PI * 2, vrot: (Math.random() - .5) * 11,
        life: 7, age: 0, bounces: 0, alpha: 1,
      });
      if (source === 'auto') this.autoActive++;
    }
  }
  burst(x, y, count, key, power = 1) {
    this.emit(x, y, count, key, power, 'manual', 'burst');
    this.flashes.push({ x, y, life: .22, power });
    if (this.flashes.length > 24) this.flashes.shift();
  }
  fountain(x, y, count, key, power = 1) { this.emit(x, y, count, key, power, 'manual', 'fountain'); }
  drop(x, y, count, key) { this.emit(x, y, count, key, 1, 'auto', 'drop'); }

  settle(p) {
    if (!p.on) return;
    p.on = false;
    if (p.source === 'auto') this.autoActive = Math.max(0, this.autoActive - 1);
    if (this.w < 1 || this.h < 1) return;
    // Keep separate room for the player's work, including during dense automation.
    const autoCount = this.pile.reduce((n, k) => n + (k.source === 'auto'), 0);
    if (p.source === 'auto' && autoCount >= Math.floor(this.maxSettled * .35)) return;
    if (this.pile.length >= this.maxSettled) {
      const autoIndex = this.pile.findIndex(k => k.source === 'auto');
      this.pile.splice(autoIndex >= 0 ? autoIndex : 0, 1);
    }
    const retention = p.source === 'auto' ? this.autoRetention : this.manualRetention;
    this.pile.push({ u: Math.max(.015, Math.min(.985, p.x / this.w)),
      y: p.y, targetY: p.y, size: p.size, key: p.key, variant: p.variant,
      rot: p.rot, depth: Math.random(), source: p.source, age: 0, life: retention + Math.random() * 6, alpha: 1 });
    this.layoutDirty = true;
  }

  layoutPile(snap = false) {
    this.heights.fill(0);
    const ceiling = Math.min(145, this.h * .23);
    for (const p of this.pile) {
      const col = Math.max(0, Math.min(this.columns - 1, Math.floor(p.u * this.columns)));
      const support = this.heights[col];
      const localCeiling = ceiling * (.85 + .15 * Math.sin(col * 2.4) ** 2);
      // Once full, fill the depth of the mound instead of stacking every new
      // kernel on a single horizontal ceiling (which looked like a floating rail).
      const depth = support >= localCeiling ? p.depth * localCeiling : support;
      p.targetY = this.h - 5 - p.size * .33 - depth;
      if (snap) p.y = p.targetY;
      // Soft overlapping heaps; no all-pairs physics as the pile grows.
      const height = Math.min(localCeiling, support + p.size * .18);
      this.heights[col] = height;
    }
    this.layoutDirty = false;
  }

  addText(x, y, text, color = '#fff', size = 22) {
    this.texts.push({ x, y, text, color, size, life: .9 });
    if (this.texts.length > 35) this.texts.shift();
  }

  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .1);
    let removed = false;
    this.pile = this.pile.filter(p => {
      p.age += dt;
      p.alpha = Math.min(1, Math.max(0, (p.life - p.age) / 5));
      if (p.age >= p.life) { removed = true; return false; }
      p.y += (p.targetY - p.y) * Math.min(1, dt * 8);
      return true;
    });
    if (removed || this.layoutDirty) this.layoutPile();
    let active = 0;
    for (const p of this.pool) {
      if (!p.on) continue;
      p.age += dt; p.life -= dt;
      if (p.life <= 0) { this.settle(p); continue; }
      p.vx *= Math.exp(-.45 * dt);
      p.vy += 820 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const margin = p.size * .35;
      if (p.x < margin || p.x > this.w - margin) {
        p.x = Math.max(margin, Math.min(this.w - margin, p.x)); p.vx *= -.5;
      }
      const col = Math.max(0, Math.min(this.columns - 1, Math.floor(p.x / Math.max(1, this.w) * this.columns)));
      const floor = this.h - 5 - p.size * .33 - this.heights[col];
      if (p.y >= floor && p.vy > 0) {
        p.y = floor; p.bounces++;
        if (p.bounces >= 3 || p.vy < 75) { this.settle(p); continue; }
        p.vy *= -.36; p.vx *= .72; p.vrot *= .6;
      }
      p.rot += p.vrot * dt;
      active++;
    }
    this.active = active;
    for (const t of this.texts) { t.life -= dt; t.y -= 40 * dt; }
    this.texts = this.texts.filter(t => t.life > 0);
    for (const f of this.flashes) f.life -= dt;
    this.flashes = this.flashes.filter(f => f.life > 0);
  }

  drawKernel(p, settled) {
    const sprite = this.sprite(p.key, p.variant);
    if (!sprite) return;
    const ctx = this.ctx;
    const grow = settled ? 1 : Math.min(1, .4 + p.age * 8);
    const size = p.size * grow;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(settled ? p.u * this.w : p.x, p.y);
    ctx.rotate(p.rot);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    for (const p of this.pile) this.drawKernel(p, true);
    for (const p of this.pool) if (p.on) this.drawKernel(p, false);
    ctx.save();
    for (const f of this.flashes) {
      ctx.globalAlpha = f.life / .22 * .65;
      ctx.strokeStyle = '#ffe5a0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x, f.y, (1 - f.life / .22) * 65 * f.power, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 2);
      ctx.font = `900 ${t.size}px system-ui, sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = '#fffaf0';
      ctx.strokeText(t.text, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }
}
