/* One reversible scroll timeline, from empty trailer to the overhead road. */
(() => {
  'use strict';
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const mix = (a, b, p) => a + (b - a) * p;
  const ease = p => p * p * (3 - 2 * p);
  class Sequence {
    constructor(urls, invalidate, options = {}) {
      this.options=options;
      this.urls = urls; this.cache = new Map(); this.target = 0; this.invalidate = invalidate;
      this.pending = 0; this.queue = []; this.lastImage = null; this.seek(0);
    }
    seek(progress) {
      const previous = this.target;
      this.position = clamp(progress) * (this.urls.length - 1);
      this.target = Math.round(this.position);
      const direction = this.target >= previous ? 1 : -1;
      const wanted = [this.target, Math.floor(this.position), Math.ceil(this.position)];
      const ahead = this.options.lookAhead || 6, behind = this.options.lookBehind || 6;
      for (let n = 1; n <= Math.max(ahead, behind); n++) {
        if(n<=ahead)wanted.push(this.target+n*direction);
        if(n<=behind)wanted.push(this.target-n*direction);
      }
      // Keep both handoff frames available, including when scrolling backward.
      wanted.push(0, this.urls.length - 1);
      if(this.warmed)for(let n=0;n<this.urls.length;n++)wanted.push(n);
      this.queue = wanted.filter(n => n >= 0 && n < this.urls.length && !this.cache.has(n)); this.load();
      if (!this.options.retainAll && this.cache.size > ahead + behind + 8) for (const [n, entry] of this.cache) {
        const offset=(n-this.target)*direction;
        if (n !== 0 && n !== this.urls.length - 1 && entry.ready && (offset>ahead+1 || offset < -behind-1)) this.cache.delete(n);
      }
    }
    warm(){if(this.warmed)return;this.warmed=true;this.seek(this.position/(this.urls.length-1));}
    load() {
      while (this.pending < (this.options.concurrency || 4) && this.queue.length) {
        const n = this.queue.shift(); if (this.cache.has(n)) continue;
        const image = new Image(), entry = {image, ready: false}; this.cache.set(n, entry); this.pending++;
        image.decoding = 'async';
        const finish = ready => { entry.ready = ready; this.pending--; this.invalidate(); this.load(); };
        image.onload = async () => {
          try {
            await image.decode();
            if(this.options.maxWidth && typeof createImageBitmap === 'function' && image.naturalWidth>this.options.maxWidth){
              try{entry.image=await createImageBitmap(image,{resizeWidth:this.options.maxWidth,resizeHeight:Math.round(image.naturalHeight*this.options.maxWidth/image.naturalWidth),resizeQuality:'high'});}catch{/* Keep the decoded original if bitmap resizing is unavailable. */}
            }
            finish(true);
          } catch { finish(false); }
        };
        image.onerror = () => finish(false);
        image.src = this.urls[n];
      }
    }
    image(nearest = false) {
      const exact = this.cache.get(this.target); if (exact?.ready) return this.lastImage = exact.image;
      let closest = null, distance = Infinity;
      for (const [n, entry] of this.cache) if (entry.ready && Math.abs(n - this.target) < distance) { closest = entry.image; distance = Math.abs(n - this.target); }
      return nearest ? (closest || this.lastImage) : (this.lastImage || closest);
    }
    ready() { return !!this.cache.get(this.target)?.ready; }
    blendReady() { return [Math.floor(this.position), Math.ceil(this.position)].every(n => this.cache.get(n)?.ready); }
    blendedImage() {
      const lower=this.cache.get(Math.floor(this.position)),upper=this.cache.get(Math.ceil(this.position));
      const fraction=this.position%1;
      if(!lower?.ready || !upper?.ready)return this.image(true);
      if(fraction<.0001)return lower.image;
      if(!this.blendCanvas){
        if(typeof document==='undefined')return this.image(true);
        this.blendCanvas=document.createElement('canvas');
      }
      const canvas=this.blendCanvas,w=lower.image.naturalWidth||lower.image.width,h=lower.image.naturalHeight||lower.image.height;
      if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
      const ctx=canvas.getContext('2d');
      ctx.clearRect(0,0,w,h);
      // Weighted premultiplied-alpha addition keeps transparent truck edges
      // from darkening or flashing as we interpolate adjacent source poses.
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1-fraction;
      ctx.drawImage(lower.image,0,0,w,h);
      ctx.globalCompositeOperation='lighter';ctx.globalAlpha=fraction;
      ctx.drawImage(upper.image,0,0,w,h);
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      return canvas;
    }
    draw(ctx, ...bounds) {
      const lower = this.cache.get(Math.floor(this.position)), upper = this.cache.get(Math.ceil(this.position));
      const image = this.image();
      if (!image) return;
      // Opaque crane frames can be interpolated without transparent ghost edges.
      if (lower?.ready && upper?.ready) {
        ctx.drawImage(lower.image, ...bounds);
        ctx.save(); ctx.globalAlpha = this.position % 1; ctx.drawImage(upper.image, ...bounds); ctx.restore();
      } else ctx.drawImage(image, ...bounds);
    }
  }
  window.FreightJourney = class {
    // Spend less scroll on setup/lifting pauses, while retaining reading time
    // for the services and reliability panels. All artwork frames stay available.
    static timelineProgress(scrollProgress) {
      const stops = [[0,0],[.003,.04],[.015,.19],[.035,.31],[.055,.38],
        [.09,.46],[.10,.50],[.17,.57],[.52,.80],[.59,.87],
        [.64,.91],[.70,.94],[.90,.965],[.92,.965],[1,1]];
      const scroll = clamp(scrollProgress);
      for (let i=1;i<stops.length;i++) {
        const [end,phase]=stops[i], [start,previous]=stops[i-1];
        if(scroll<=end)return mix(previous,phase,(scroll-start)/(end-start));
      }
      return 1;
    }
    constructor(section, reduced) {
      this.section = section; this.reduced = reduced; this.canvas = section.querySelector('canvas'); this.ctx = this.canvas.getContext('2d');
      this.panel = section.querySelector('.freight-services'); this.horizontal = section.querySelector('.services-horizontal');
      this.copy = section.querySelector('.freight-reliability'); this.word = section.querySelector('.freight-word'); this.speed = section.querySelector('[data-freight-speed]');
      this.dirty = true; this.lastProgress = -1; this.parts = {}; this.readyParts = new Set(); this.tick = performance.now();
      for (const [key, src] of Object.entries(window.FREIGHT_ASSETS)) {
        const image = new Image(); image.decoding = 'async';
        image.onload = async () => { try { await image.decode(); this.readyParts.add(key); this.dirty = true; } catch {} };
        image.src = src; this.parts[key] = image;
      }
      const frames = window.JOURNEY_FRAMES;
      this.crane = new Sequence([...frames.lift, ...frames.rotate, ...frames.place], () => { this.dirty = true; }, {lookAhead:18,lookBehind:3,concurrency:6});
      this.turn = new Sequence(frames.truck, () => { this.dirty = true; }, {maxWidth:1024,retainAll:true,concurrency:2});
      this.resize();
      if(typeof ResizeObserver==='function'){
        this.layoutObserver=new ResizeObserver(()=>this.measureLayout());
        this.layoutObserver.observe(this.horizontal);this.layoutObserver.observe(this.copy);
      }
    }
    resize() {
      this.w = this.canvas.clientWidth; this.h = this.canvas.clientHeight; const d = Math.min(devicePixelRatio || 1, 1.5);
      this.canvas.width = this.w * d; this.canvas.height = this.h * d; this.ctx.setTransform(d, 0, 0, d, 0, 0);
      this.mobile = this.w < 768; this.unit = this.w / 1280;
      this.measureLayout();
      this.dirty = true;
    }
    measureLayout(){this.servicesDistance=Math.max(0,this.horizontal.scrollWidth-this.w+this.w*.04);this.copyTravel=Math.max(0,this.copy.scrollHeight-this.h+70);this.dirty=true;}
    drawTurn(image,width){
      const scale=(image.naturalWidth || image.width)/2880;
      this.ctx.drawImage(image,68*scale,0,2764*scale,809*scale,-width/2,-width*809/2764/2,width,width*809/2764);
    }
    image(key, x, y, w, h) { const image = this.parts[key]; if (image?.complete && image.naturalWidth) this.ctx.drawImage(image, x, y, w, h); }
    // These dimensions align the trailer deck with the last crane frame exactly.
    truck(x, floor, width, loaded, spin) {
      const ctx = this.ctx, k = width / 2664, height = 614 * k, y = floor - height;
      if (loaded) {
        const image = this.parts.container;
        if (image?.complete && image.naturalWidth) ctx.drawImage(image, 0, 0, 2088, 433, x, y + 5 * width / 848, width * 2088 / 2664, width * 420 / 2664);
      }
      this.image('chassis', x, y, width, height);
      const wheels = [[.055, .0707155, 'wheelFront'], [.291, .0622196, 'wheelRear'], [.629, .0622196, 'wheelRear'], [.704, .0622196, 'wheelRear'], [.783, .0622196, 'wheelRear']];
      for (const [right, size, key] of wheels) {
        const diameter = width * size, cx = x + width * (1 - right) - diameter / 2, cy = floor - diameter / 2;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin); this.image(key, -diameter / 2, -diameter / 2, diameter, diameter); ctx.restore();
      }
    }
    update(scrollProgress, speed) {
      if (this.reduced) { this.panel.inert = false; this.copy.inert = false; return; }
      const now = performance.now(), dt = Math.min(64, now - this.tick); this.tick = now;
      const target = clamp(scrollProgress), previous = this.playhead ?? (target <= .50 ? 0 : target);
      const delta = target - previous;
      // The sea is already entering at the end of the track; its matching cargo
      // anchor must be exact even after a fast wheel or touch gesture.
      const response=previous>=.50 && previous<.965 ? 55 : 32;
      let p = target === 1 || Math.abs(delta) < .000015 ? target : previous + delta * (1 - Math.exp(-dt / response));
      // Keep every crane pose visible, even when a wheel gesture jumps ahead.
      // At 60 Hz this advances less than one source frame per paint.
      if (previous < .50 && target > previous) p = Math.min(p, previous + dt * .000065);
      if (target < .50 && previous > target) p = previous > .50 ? Math.max(p, .50) : Math.max(p, previous - dt * .000065);
      const ctx = this.ctx, w = this.w, h = this.h, s = this.unit;
      this.speed.textContent = String(Math.round(p > .5 && p < .99 ? speed : 0)).padStart(2, '0');
      if (p === this.lastProgress && !this.dirty) return;
      const liftEnd = 79, rotateEnd = 128, end = 177;
      let frame = mix(0, liftEnd, ease(range(p, .04, .19)));
      if (p >= .19) frame = mix(liftEnd, rotateEnd, ease(range(p, .19, .31)));
      if (p >= .38) frame = mix(rotateEnd, end, ease(range(p, .38, .46)));
      this.crane.seek(frame / end);
      const pullback = ease(range(p, .50, .57)), drive = range(p, .57, .80), turn = range(p, .80, .87), corner = ease(range(p, .87, .91));
      this.turn.seek(turn);
      if(p>.50)this.turn.warm();
      // Never clear the scene until the replacement artwork is fully decoded.
      const required = p < .31 ? ['stackBlue', 'stackOrange'] : ['chassis', 'container', 'wheelFront', 'wheelRear'];
      if (p >= .46 && p < .57) required.push('craneBase', 'spreader');
      if (required.some(key => !this.readyParts.has(key))) return;
      if (p < .46 && !this.crane.blendReady()) return;
      if (p >= .80 && !this.turn.image(true)) return;
      // Commit only after both neighboring crane images have decoded. A cache
      // miss holds the playhead as well as the canvas, avoiding catch-up jumps.
      this.playhead = p;
      this.lastProgress = p; this.dirty = false;
      const loadingFloor = h * (this.mobile ? .66 : .90), drivingFloor = h * (this.mobile ? .30 : .40);
      const floor = mix(loadingFloor, drivingFloor, pullback);
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      if (p < .80) {
        // The crane frame includes one suspended container. No loaded truck is drawn until release.
        if (p < .46) {
          this.crane.draw(ctx, 0, loadingFloor - 631.5 * s + 165 * s, 1024 * s, 576 * s);
          const stackShift = ease(range(p, .19, .32)) * w;
          ctx.save(); ctx.globalAlpha = 1 - range(p, .28, .33);
          this.image('stackBlue', 880 * s + stackShift, loadingFloor - 134 * s, 115 * s, 134 * s);
          this.image('stackOrange', 995 * s + stackShift, loadingFloor - 134 * s, 115 * s, 134 * s); ctx.restore();
        } else if (p < .57) {
          const craneScale = mix(1, .62, pullback), craneX = -ease(range(p, .51, .57)) * w;
          ctx.save(); ctx.translate(craneX, floor - 631.5 * s * craneScale); ctx.scale(s * craneScale, s * craneScale);
          this.image('craneBase', 0, 165, 1024, 576);
          this.image('spreader', 0, 165 - ease(range(p, .46, .50)) * 150, 1024, 576); ctx.restore();
        }
        const truckWidth = mix(848, this.mobile ? 720 : 530, pullback) * s;
        const truckX = mix(180, 175 + drive * 140, pullback) * s + (1 - ease(range(p, .31, .375))) * w;
        if (p >= .31) this.truck(truckX, floor, truckWidth, p >= .46, p < .38 ? -range(p, .31, .375) * 12 : drive * 50);
        ctx.fillStyle = '#111'; ctx.fillRect(0, floor, w, h - floor);
      } else {
        const roadReveal = ease(turn);
        ctx.fillStyle = '#111'; ctx.fillRect(0, mix(drivingFloor, 0, roadReveal), w, h);
        const image = this.turn.blendedImage();
        const dock = ease(range(p, .965, 1));
        const startWidth = (this.mobile ? 720 : 530) * s;
        const truckWidth = mix(mix(startWidth, Math.min(w * .45, h * .65), corner), h * .336, dock);
        const startX = (315 + (this.mobile ? 720 : 530) / 2) * s;
        const startY = drivingFloor - 348.5 * startWidth / 2764;
        const radius = Math.min(h * .32, w * .17), angle = corner * Math.PI / 2;
        const pan = ease(range(p, .91, .94)) * (startX + radius - w * .23);
        const x = mix(startX + radius * Math.sin(angle) - pan, w * .5, dock);
        const y = mix(startY + radius * (1 - Math.cos(angle)), h * .5 + truckWidth * .1052, dock);
        // Side view becomes overhead using the original perspective frames, then follows the road bend.
        ctx.save(); ctx.strokeStyle = '#ffffff26'; ctx.lineWidth = 1; ctx.setLineDash([22, 24]);
        ctx.lineDashOffset = -p * 4500;
        ctx.translate(-pan, 0);
        ctx.beginPath(); ctx.moveTo(-w, startY); ctx.lineTo(startX, startY);
        ctx.arc(startX, startY + radius, radius, -Math.PI / 2, 0);
        ctx.lineTo(startX + radius, h * 2); ctx.stroke(); ctx.restore();
        if (image) {
          // Match the sequence's transparent margins to the side-view truck; no size jump at the handoff.
          ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
          this.drawTurn(image,truckWidth); ctx.restore();
        }
        // Pull the roadway to the left as the reliability content enters on the right.
        if (p > .91) { const edge = mix(w, w * .43, ease(range(p, .91, .94))); ctx.fillStyle = '#fff'; ctx.fillRect(edge, 0, w - edge, h); }
        // Narrow and center the road around the cargo before the sea wipes upward.
        // The final cargo dimensions match the central white slot in the ship artwork.
        if (dock > 0) {
          const roadWidth = mix(w * .43, Math.max(h * .25, truckWidth * .65), dock);
          const roadLeft = mix(0, w * .5 - roadWidth / 2, dock);
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#111'; ctx.fillRect(roadLeft, 0, roadWidth, h);
          ctx.save(); ctx.strokeStyle = '#ffffff26'; ctx.setLineDash([22, 24]); ctx.lineDashOffset = -p * 4500;
          for (const offset of [-.28,.28]) { ctx.beginPath(); ctx.moveTo(x+roadWidth*offset,0);ctx.lineTo(x+roadWidth*offset,h);ctx.stroke(); }
          ctx.translate(x,y);ctx.rotate(angle);ctx.scale(1,mix(1,.88,dock));
          if(image)this.drawTurn(image,truckWidth);
          ctx.restore();
        }
      }
      const panelVisible = p >= .54 && p < .83;
      this.panel.style.visibility = panelVisible ? 'visible' : 'hidden'; this.panel.inert = !panelVisible;
      this.panel.style.top = drivingFloor + 'px'; this.panel.style.opacity = Math.min(range(p, .54, .57), 1 - range(p, .80, .83));
      const distance = this.servicesDistance;
      this.horizontal.style.transform = `translate3d(${-drive * distance}px,0,0)`;
      this.word.style.opacity = p >= .53 && p < .81 ? String(Math.min(range(p, .53, .56), 1 - range(p, .79, .81))) : '0';
      this.word.style.top = Math.max(50, drivingFloor - w * .16) + 'px'; this.word.style.transform = `translateX(${-drive * 120}vw)`;
      const copyVisible = p > .91;
      this.copy.style.visibility = copyVisible ? 'visible' : 'hidden'; this.copy.inert = !copyVisible;
      this.copy.style.opacity = ease(range(p, .91, .94)) * (1-ease(range(p,.965,.995)));
      this.copy.style.transform = `translate3d(${(1 - ease(range(p, .91, .94))) * w * .57}px,${mix(70, -this.copyTravel, range(p, .94, .965))}px,0)`;
      const phase = p < .19 ? 'lift' : p < .31 ? 'rotate' : p < .38 ? 'empty-trailer-arrives' : p < .46 ? 'lower-container' : p < .50 ? 'release' : p < .57 ? 'depart' : p < .80 ? 'drive' : p < .87 ? 'overhead' : p < .94 ? 'road-bend' : p < .965 ? 'reliability' : 'container-handoff';
      this.section.dataset.phase = phase; this.section.dataset.progress = p.toFixed(4); this.section.dataset.loaded = String(p >= .46);
      this.section.querySelector('.freight-hint').style.opacity = p < .31 ? '1' : '0';
    }
  };
})();
