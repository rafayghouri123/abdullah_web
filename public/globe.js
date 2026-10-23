/* Independent geographic canvas renderer. Coordinates: Natural Earth / world-atlas. */
(() => {
  'use strict';
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const vector = (lon, lat) => [Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)];
  class UnitedGlobe {
    constructor(canvas, reduced) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.reduced = reduced;
      this.yaw = -1.95; this.pitch = .15; this.velocity = 0; this.paused = reduced;
      this.lastTime = 0; this.idleUntil = 0; this.drag = null; this.hover = null;
      this.land = []; this.edges = []; this.pins = []; this.routes = [];
      canvas.tabIndex = 0;
      canvas.setAttribute('role', 'region');
      canvas.setAttribute('aria-label', 'Interactive world globe. Drag to rotate, or use arrow keys. Space pauses rotation. Home resets the view.');
      this.labels = document.createElement('div'); this.labels.className = 'country-labels'; this.labels.setAttribute('aria-hidden', 'true');
      canvas.after(this.labels);
      this.toolbar = document.createElement('div'); this.toolbar.className = 'globe-controls';
      this.toolbar.innerHTML = '<span>DRAG TO EXPLORE</span><button type="button" class="globe-pause" aria-label="Pause globe rotation">Ⅱ</button><button type="button" class="globe-reset" aria-label="Reset globe view">↺</button>';
      document.querySelector('.home-hero-stick').append(this.toolbar);
      this.pauseButton = this.toolbar.querySelector('.globe-pause');
      this.pauseButton.addEventListener('click', () => this.togglePause());
      this.toolbar.querySelector('.globe-reset').addEventListener('click', () => this.reset());
      this.syncPause();
      this.status = document.createElement('span'); this.status.className = 'globe-sr-only'; this.status.setAttribute('aria-live', 'polite'); this.toolbar.append(this.status);
      this.bindInput(); this.resize();
      fetch('/globe-data.json').then(r => { if (!r.ok) throw new Error('Globe map unavailable'); return r.json(); }).then(data => {
        const vectors = flat => { const a = []; for (let i = 0; i < flat.length; i += 2) a.push(vector(flat[i], flat[i + 1])); return a; };
        this.land = vectors(data.land); this.edges = vectors(data.edges);
        this.pins = data.pins.map(pin => {
          const label = document.createElement('span'); label.className = 'country-label'; label.textContent = pin.country;
          this.labels.append(label); return {...pin, v: vector(pin.lon, pin.lat), label};
        });
        const byCode = Object.fromEntries(this.pins.map(p => [p.code, p]));
        this.routes = data.routes.map(([a, b]) => {
          const va = byCode[a].v, vb = byCode[b].v;
          const angle = Math.acos(clamp(va.reduce((s, v, i) => s + v * vb[i], 0), -1, 1));
          return Array.from({length: 65}, (_, i) => {
            const f = i / 64, sa = Math.sin((1 - f) * angle) / Math.sin(angle), sb = Math.sin(f * angle) / Math.sin(angle);
            const altitude = 1 + Math.sin(f * Math.PI) * (.05 + angle * .055);
            return va.map((v, j) => (v * sa + vb[j] * sb) * altitude);
          });
        });
        canvas.dataset.ready = 'true';
      }).catch(() => { this.status.textContent = 'The globe map could not load. Please refresh to retry.'; });
    }
    syncPause() { this.pauseButton.textContent = this.paused ? '▶' : 'Ⅱ'; this.pauseButton.setAttribute('aria-label', this.paused ? 'Play globe rotation' : 'Pause globe rotation'); this.pauseButton.setAttribute('aria-pressed', String(this.paused)); }
    togglePause() { this.paused = !this.paused; this.velocity = 0; this.syncPause(); }
    reset() { this.yaw = -1.95; this.pitch = .15; this.velocity = 0; this.idleUntil = performance.now() + 1500; }
    bindInput() {
      const c = this.canvas;
      c.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        this.drag = {id: e.pointerId, x: e.clientX, y: e.clientY}; this.velocity = 0;
        c.setPointerCapture(e.pointerId); c.classList.add('is-dragging'); c.focus({preventScroll: true});
      });
      c.addEventListener('pointermove', e => {
        if (this.drag && e.pointerId === this.drag.id) {
          const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
          this.velocity = dx * .004; this.yaw += dx * .006;
          this.pitch = clamp(this.pitch - dy * .005, -1.2, 1.2);
          this.drag.x = e.clientX; this.drag.y = e.clientY; this.hover = null;
        } else {
          const bounds = c.getBoundingClientRect();
          const x = (e.clientX - bounds.left) * this.w / bounds.width, y = (e.clientY - bounds.top) * this.h / bounds.height;
          this.hover = this.pins.find(p => p.screen?.visible && Math.hypot(p.screen.x - x, p.screen.y - y) < 24) || null;
          c.dataset.country = this.hover?.country || '';
        }
      });
      const release = e => {
        if (!this.drag || e.pointerId !== this.drag.id) return;
        this.drag = null; c.classList.remove('is-dragging'); this.idleUntil = performance.now() + 1800;
        if (c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
      };
      c.addEventListener('pointerup', release); c.addEventListener('pointercancel', release); c.addEventListener('lostpointercapture', release);
      c.addEventListener('pointerleave', () => { this.hover = null; c.dataset.country = ''; });
      c.addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Home'].includes(e.key)) return;
        e.preventDefault(); this.velocity = 0; this.idleUntil = performance.now() + 4000;
        if (e.key === 'ArrowLeft') this.yaw -= .18;
        if (e.key === 'ArrowRight') this.yaw += .18;
        if (e.key === 'ArrowUp') this.pitch = clamp(this.pitch + .12, -1.2, 1.2);
        if (e.key === 'ArrowDown') this.pitch = clamp(this.pitch - .12, -1.2, 1.2);
        if (e.key === ' ') this.togglePause();
        if (e.key === 'Home') this.reset();
        this.announce = true;
      });
    }
    resize() {
      for(const pin of this.pins){pin.labelWidth=0;pin.labelHeight=0;pin.labelX=null;}
      const c = this.canvas, dpr = Math.min(devicePixelRatio || 1, 2);
      this.w = c.clientWidth; this.h = c.clientHeight;
      c.width = Math.round(this.w * dpr); c.height = Math.round(this.h * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.radius = Math.min(this.w, this.h) * .405; this.cx = this.w / 2; this.cy = this.h / 2;
    }
    project(v) {
      const x = v[0] * this.cosYaw + v[2] * this.sinYaw, z = v[2] * this.cosYaw - v[0] * this.sinYaw;
      const y = v[1] * this.cosPitch + z * this.sinPitch, depth = z * this.cosPitch - v[1] * this.sinPitch;
      return {x: this.cx + x * this.radius, y: this.cy - y * this.radius, z: depth, visible: depth > .04};
    }
    draw(t, scroll) {
      const dt = Math.min(50, this.lastTime ? t - this.lastTime : 16); this.lastTime = t;
      if (!this.drag && !this.reduced) {
        this.yaw += this.velocity * dt / 16; this.velocity *= Math.pow(.91, dt / 16);
        if (!this.paused && !this.hover && t > this.idleUntil) this.yaw += dt * .00009;
      }
      this.cosYaw = Math.cos(this.yaw + scroll * .7); this.sinYaw = Math.sin(this.yaw + scroll * .7);
      this.cosPitch = Math.cos(this.pitch); this.sinPitch = Math.sin(this.pitch);
      const ctx = this.ctx, r = this.radius;
      ctx.clearRect(0, 0, this.w, this.h);
      const gradient = ctx.createRadialGradient(this.cx - r * .3, this.cy - r * .3, 0, this.cx, this.cy, r);
      gradient.addColorStop(0, 'rgba(10,15,28,.35)'); gradient.addColorStop(.94, 'rgba(0,0,0,.4)'); gradient.addColorStop(1, 'rgba(72,88,136,.18)');
      ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(this.cx, this.cy, r, 0, TAU); ctx.fill();
      const dots = (points, color, size) => {
        ctx.fillStyle = color; ctx.beginPath();
        for (const point of points) { const p = this.project(point); if (!p.visible) continue; const dot = size * (.6 + p.z * .4); ctx.moveTo(p.x + dot, p.y); ctx.arc(p.x, p.y, dot, 0, TAU); }
        ctx.fill();
      };
      dots(this.land, 'rgba(213,222,241,.24)', Math.max(.55, r * .0021));
      dots(this.edges, 'rgba(244,247,255,.82)', Math.max(.65, r * .0024));
      this.routes.forEach((route, index) => {
        ctx.beginPath(); let started = false;
        route.forEach(v => { const p = this.project(v); const outside = Math.hypot(p.x - this.cx, p.y - this.cy) > r; if (p.z > 0 || outside) { if (!started) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); started = true; } else started = false; });
        ctx.strokeStyle = 'rgba(244,83,0,.42)'; ctx.lineWidth = .8; ctx.stroke();
        const position=((this.reduced ? .4 : t*.00009)+index*.137)%1*64;
        const lower=Math.floor(position),fraction=position-lower;
        const p = this.project(route[lower].map((v,i)=>v+(route[Math.min(64,lower+1)][i]-v)*fraction));
        if (p.z > 0 || Math.hypot(p.x - this.cx, p.y - this.cy) > r) { ctx.fillStyle = '#ff722f'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, TAU); ctx.fill(); }
      });
      const occupied = [], names = [];
      [...this.pins].sort((a, b) => (b === this.hover) - (a === this.hover)).forEach((pin, index) => {
        const p = this.project(pin.v); pin.screen = p;
        pin.label.hidden = !p.visible; if (!p.visible) return;
        const pulse = this.reduced ? .4 : (t * .00045 + index * .19) % 1;
        ctx.fillStyle = '#f45300'; ctx.beginPath(); ctx.arc(p.x, p.y, this.hover === pin ? 3.8 : 2.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(244,83,0,${(1 - pulse) * .55})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, 3 + pulse * 10, 0, TAU); ctx.stroke();
        const width = pin.labelWidth || (pin.labelWidth=pin.label.offsetWidth) || pin.country.length * 7 + 16;
        const height = pin.labelHeight || (pin.labelHeight=pin.label.offsetHeight) || 24;
        const x = clamp(p.x - width / 2, 0, this.w - width); let y = p.y - height - 12;
        for (let attempt = 0; attempt < 5 && occupied.some(b => x < b.x + b.w + 3 && x + width + 3 > b.x && y < b.y + b.h + 3 && y + height + 3 > b.y); attempt++) y -= height + 4;
        occupied.push({x, y, w: width, h: height});
        const blend=this.reduced?1:1-Math.exp(-dt/65);
        if(pin.labelX==null){pin.labelX=x;pin.labelY=y;}
        pin.labelX+=(x-pin.labelX)*blend;pin.labelY+=(y-pin.labelY)*blend;
        if (p.y - y > height + 20) { ctx.strokeStyle = 'rgba(244,83,0,.35)'; ctx.beginPath(); ctx.moveTo(p.x, p.y - 4); ctx.lineTo(pin.labelX + width / 2, pin.labelY + height); ctx.stroke(); }
        pin.label.style.transform = `translate3d(${pin.labelX}px,${pin.labelY}px,0)`;
        pin.label.style.opacity = clamp(p.z * 4, .15, 1); pin.label.classList.toggle('is-highlighted', pin === this.hover);
        names.push(pin.country);
      });
      this.canvas.dataset.rotation = this.yaw.toFixed(3); this.canvas.dataset.visibleCountries = names.join(', ');
      if (this.announce) { this.status.textContent = 'Visible countries: ' + names.join(', '); this.announce = false; }
    }
  }
  window.UnitedGlobe = UnitedGlobe;
})();
