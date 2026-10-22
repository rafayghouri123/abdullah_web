import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function harness() {
  let time = 0, clears = 0;
  const images = [];
  class Image {
    constructor() { this.complete = false; this.naturalWidth = 0; images.push(this); }
    decode() { return new Promise(resolve => { this.resolveDecode = resolve; }); }
    load() { this.complete = true; this.naturalWidth = 2880; this.onload?.(); }
  }
  const ctx = new Proxy({}, {get: (_, name) => name === 'clearRect' ? () => clears++ : () => {}});
  const elements = new Map();
  const section = {dataset: {}, querySelector(selector) {
    if (!elements.has(selector)) elements.set(selector, {style: {}, scrollHeight: 1200, scrollWidth: 4000,
      clientWidth: 1280, clientHeight: 720, getContext: () => ctx});
    return elements.get(selector);
  }};
  const frames = n => Array.from({length: n}, (_, i) => `${n}/${i}`);
  const window = {JOURNEY_FRAMES: {lift: frames(80), rotate: frames(49), place: frames(49), truck: frames(45)},
    FREIGHT_ASSETS: Object.fromEntries(['chassis', 'container', 'wheelFront', 'wheelRear', 'stackBlue', 'stackOrange', 'craneBase', 'spreader'].map(x => [x, x]))};
  const source = fs.readFileSync(new URL('../public/freight.js', import.meta.url), 'utf8');
  vm.runInNewContext(source.replace('window.FreightJourney = class', 'window.SequenceForTest = Sequence; window.FreightJourney = class'),
    {window, Image, devicePixelRatio: 1, performance: {now: () => time}});
  const settle = async () => {
    for (let i = 0; i < 20; i++) {
      for (const image of images) if (!image.complete) image.load();
      for (const image of images) image.resolveDecode?.();
      await Promise.resolve();
    }
  };
  return {window, section, images, settle, clears: () => clears, tick: () => { time += 16.67; }};
}

test('frames are not presented before decode and survive distant cache eviction', async () => {
  const h = harness(), sequence = new h.window.SequenceForTest(Array.from({length: 180}, (_, i) => String(i)), () => {});
  h.images[0].load();
  assert.equal(sequence.ready(), false, 'network completion is not decoded readiness');
  await h.settle();
  const original = sequence.image();
  sequence.seek(.8);
  assert.equal(sequence.image(), original, 'retain the displayed frame while the next frame is pending');
  await h.settle();
  const farFrame = sequence.image();
  for (const p of [.2, .9, .4, .7]) { sequence.seek(p); await h.settle(); sequence.image(); }
  sequence.seek(.01);
  assert.ok(sequence.image(), 'a fast reverse seek must never produce a blank image');
  assert.notEqual(farFrame, original);
  assert.ok(sequence.cache.size <= 30, 'decoded cache remains bounded');
});

test('compact scroll pacing preserves phase order, content time, and both handoff endpoints', () => {
  const h=harness(), map=h.window.FreightJourney.timelineProgress;
  assert.equal(map(-1),0);
  assert.equal(map(2),1);
  assert.equal(map(.035),.19,'pickup completes within 0.273 viewport heights');
  assert.equal(map(.324),.57,'loading and departure complete within the shorter track');
  assert.equal(map(.693),.80,'services retain almost three viewport heights of scroll');
  let previous=0;
  for(let i=0;i<=1000;i++){
    const p=map(i/1000);
    assert.ok(p>=previous && p-previous<.01,'no skipped or reversed choreography at phase boundaries');
    previous=p;
  }
  for(let i=1000;i>=0;i--)assert.ok(map(i/1000)<=map(Math.min(1,(i+1)/1000)));
});

test('pending frames preserve the canvas; fast scrolling settles smoothly in both directions', async () => {
  const h = harness(), journey = new h.window.FreightJourney(h.section, false);
  h.tick(); journey.update(0, 0);
  assert.equal(h.clears(), 0, 'do not clear the canvas while initial assets are pending');
  await h.settle(); h.tick(); journey.update(0, 0);
  const before = h.clears();
  h.tick(); journey.update(.43, 90);
  assert.equal(h.clears(), before, 'keep the last rendered scene during a cache miss');
  for (const target of [.43, .79, .86, .93, 1, .37]) {
    const start = journey.lastProgress;
    for (let i = 0; i < 180; i++) { await h.settle(); h.tick(); journey.update(target, 30); }
    assert.ok(Math.abs(journey.lastProgress - target) < .00002, `settles at ${target}`);
    assert.notEqual(journey.lastProgress, start);
    if(target===1)assert.equal(h.section.dataset.phase,'container-handoff','the cargo stays for the ship reveal');
  }
  assert.equal(h.section.dataset.loaded, 'false', 'reverse scroll restores the empty trailer');
});

test('truck responds within 100ms and keeps moving while turn frames are pending', async()=>{
  const h=harness(),journey=new h.window.FreightJourney(h.section,false);
  await h.settle();h.tick();journey.update(.79,0);
  const before=h.clears();
  // Deliberately leave newly requested turn frames undecoded.
  for(let i=0;i<6;i++){h.tick();journey.update(.84,40);}
  assert.ok(h.clears()>before+4,'ready fallback artwork must allow the road/camera to keep moving');
  assert.ok(Math.abs(journey.lastProgress-.84)<.003,'truck follows a scroll step within 100ms');
  assert.equal(journey.turn.ready(),false,'test exercises an actual pending target frame');
  for(let i=0;i<6;i++){h.tick();journey.update(.79,40);}
  assert.ok(Math.abs(journey.lastProgress-.79)<.003,'reverse gestures respond just as quickly');
});
