/* Keep a fast gesture from skipping the container pickup and placement. */
(() => {
  'use strict';
  window.CraneScroll = class {
    constructor(journey, reduced) {
      this.journey = journey;
      this.previousY = scrollY;
      this.done = false;
      if (reduced) { this.disabled = true; return; }
      addEventListener('wheel', event => {
        if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
        if (this.input(delta)) event.preventDefault();
      }, { passive: false });
      addEventListener('touchstart', event => { this.touchY = event.touches[0]?.clientY; }, { passive: true });
      addEventListener('touchmove', event => {
        if (event.touches.length !== 1 || this.touchY == null) return;
        const y = event.touches[0].clientY, delta = this.touchY - y;
        this.touchY = y;
        if (this.input(delta)) event.preventDefault();
      }, { passive: false });
      addEventListener('keydown', event => {
        if (event.key === 'Escape') { this.release(false); return; }
        if (event.target?.closest('input,textarea,select,button,a,[contenteditable]') || event.ctrlKey || event.metaKey || event.altKey) return;
        const delta = ({ArrowDown: 80, ArrowUp: -80, PageDown: innerHeight, PageUp: -innerHeight,
          End: innerHeight * 100, Home: -innerHeight * 100, ' ': innerHeight * (event.shiftKey ? -1 : 1)})[event.key];
        if (delta && this.input(delta)) event.preventDefault();
      });
      document.addEventListener('click', event => {
        if (event.target.closest('a[href]')) { this.release(false); this.done = true; }
      }, true);
      addEventListener('pagehide', () => this.release(false));
    }
    geometry() {
      return { top: this.journey.section.getBoundingClientRect().top + scrollY,
        travel: Math.max(1, this.journey.section.offsetHeight - innerHeight * 2) };
    }
    static scrollProgress(phase) {
      let low = 0, high = 1;
      for (let i = 0; i < 24; i++) {
        const middle = (low + high) / 2;
        if (window.FreightJourney.timelineProgress(middle) < phase) low = middle;
        else high = middle;
      }
      return (low + high) / 2;
    }
    input(delta) {
      if (this.disabled) return false;
      if (this.active) return true;
      if (delta < 0) return false;
      return this.capture(scrollY + delta);
    }
    capture(nextY, fromY = scrollY) {
      const {top, travel} = this.geometry(), current = Math.max(0, this.journey.lastProgress);
      if (this.done || current >= .50 || nextY < top || fromY > top + travel * window.CraneScroll.scrollProgress(.50)) return false;
      this.active = true;
      this.started = performance.now();
      this.savedOverflow = document.documentElement.style.overflow;
      this.savedBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.scrollBehavior = 'auto';
      this.lockY = top + window.CraneScroll.scrollProgress(current) * travel;
      this.journey.section.dataset.scrollLocked = 'true';
      scrollTo({top: this.lockY, behavior: 'instant'});
      return true;
    }
    beforeUpdate() {
      if (this.disabled) return;
      const {top, travel} = this.geometry();
      if (!this.active) {
        if (scrollY < top - innerHeight * .5) this.done = false;
        // Covers scrollbar dragging and touch inertia after the finger lifts.
        if (scrollY > this.previousY && this.previousY <= top + travel * window.CraneScroll.scrollProgress(.50)) this.capture(scrollY, this.previousY);
      }
      this.previousY = scrollY;
      if (this.active) {
        // Escape hatch for failed assets or a suspended/background tab.
        if (performance.now() - this.started > 20000) this.release(false);
        else scrollTo({top: this.lockY, behavior: 'instant'});
      }
    }
    afterUpdate() {
      if (this.active && this.journey.lastProgress >= .49998) this.release(true);
    }
    release(completed) {
      if (!this.active) return;
      const {top, travel} = this.geometry();
      this.active = false;
      this.done = true;
      this.journey.section.dataset.scrollLocked = 'false';
      const phase = completed ? .50 : Math.max(0, this.journey.lastProgress);
      scrollTo({top: top + window.CraneScroll.scrollProgress(phase) * travel, behavior: 'instant'});
      document.documentElement.style.overflow = this.savedOverflow;
      document.documentElement.style.scrollBehavior = this.savedBehavior;
      this.previousY = scrollY;
    }
  };
})();
