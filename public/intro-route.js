/* Let SVG animate the route itself, without main-thread work on every frame. */
(() => {
  'use strict';
  const route = document.querySelector('.intro-route');
  if (!route) return;

  const line = route.querySelector('.intro-route__line');
  const marker = route.querySelector('.intro-route__marker');
  const draw = route.querySelector('.intro-route__draw');
  const motion = route.querySelector('.intro-route__motion');
  const duration = 3000;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    line.setAttribute('stroke-dashoffset', '0');
    marker.setAttribute('transform', 'translate(97 277)');
    route.dataset.step = '3';
    route.classList.add('is-active', 'is-complete');
    return;
  }

  function playFallback() {
    const timing = {duration, easing: 'linear', fill: 'forwards'};
    line.animate([{strokeDashoffset: '1'}, {strokeDashoffset: '0'}], timing);
    const length = line.getTotalLength();
    const positions = Array.from({length: 241}, (_, index) => {
      const point = line.getPointAtLength(length * index / 240);
      return {transform: `translate(${point.x}px, ${point.y}px)`, offset: index / 240};
    });
    marker.animate(positions, timing);
  }

  let started = false;
  let routeObserver;
  const hero = document.querySelector('.home-hero-wrap');
  let routeVisible = false;
  let scheduled = false;
  const maybeBegin = () => {
    if (started || scheduled || !routeVisible || (hero && hero.getBoundingClientRect().bottom > 0)) return;
    scheduled = true;
    // Give the globe's final canvas paint time to clear before this motion starts.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      scheduled = false;
      if (routeVisible && (!hero || hero.getBoundingClientRect().bottom <= 0)) begin();
    }));
  };
  function begin() {
    if (started) return;
    started = true;
    routeObserver?.disconnect();
    removeEventListener('scroll', maybeBegin);
    route.dataset.step = '1';
    route.classList.add('is-active');
    if (typeof draw.beginElement === 'function' && typeof motion.beginElement === 'function') {
      draw.beginElement();
      motion.beginElement();
    } else playFallback();
    setTimeout(() => { route.dataset.step = '2'; }, duration * .43);
    setTimeout(() => { route.dataset.step = '3'; }, duration * .84);
    setTimeout(() => { route.classList.add('is-complete'); }, duration);
  }
  if (typeof IntersectionObserver === 'undefined') {
    begin();
    return;
  }
  // The globe is canvas-heavy. Start this separate animation once it has left
  // the viewport, so the first route frames get the same budget as the last.
  routeObserver = new IntersectionObserver(entries => {
    routeVisible = entries[0].intersectionRatio >= .18;
    maybeBegin();
  }, {threshold: [0, .18]});
  routeObserver.observe(route);
  addEventListener('scroll', maybeBegin, {passive: true});
})();
