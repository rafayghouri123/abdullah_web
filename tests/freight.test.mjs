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
  return {window, section, images, settle, clears: () => clears, tick: (ms = 16.67) => { time += ms; }};
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
  assert.equal(map(.015),.19,'pickup requires just 0.117 viewport heights');
  assert.equal(map(.10),.50,'loading and release need under one viewport of scrolling');
  assert.equal(map(.52),.80,'services retain 2.73 viewport heights of scroll');
  assert.equal(map(.70),.94,'reliability text appears before the longer reading segment');
  assert.equal(map(.90),.965,'reading gets 1.56 viewport heights before docking');
  assert.equal(map(.91),.965,'hold the final text fully visible before the handoff');
  let previous=0;
  for(let i=0;i<=10000;i++){
    const p=map(i/10000);
    assert.ok(p>=previous && p-previous<.01,'no skipped or reversed choreography at phase boundaries');
    previous=p;
  }
  for(let i=1000;i>=0;i--)assert.ok(map(i/1000)<=map(Math.min(1,(i+1)/1000)));
});

test('all reliability text reaches the viewport before the ship handoff fades it',async()=>{
  const h=harness(),journey=new h.window.FreightJourney(h.section,false);
  await h.settle();h.tick();journey.update(.965,0);
  await h.settle();h.tick();journey.update(.965,0);
  const copy=h.section.querySelector('.freight-reliability');
  assert.equal(copy.style.opacity,1);
  assert.ok(copy.style.transform.includes(`${-journey.copyTravel}px`),'last text must be fully scrolled into view');
});

test('pending frames preserve the canvas; fast scrolling settles smoothly in both directions', async () => {
  const h = harness(), journey = new h.window.FreightJourney(h.section, false);
  h.tick(); journey.update(0, 0);
  assert.equal(h.clears(), 0, 'do not clear the canvas while initial assets are pending');
  await h.settle(); h.tick(); journey.update(0, 0);
  const before = h.clears();
  h.tick(); journey.update(.43, 90);
  assert.ok(journey.lastProgress < .01, 'a fast gesture cannot jump over crane poses');
  for(let i=0;i<180;i++){h.tick();journey.update(.43,90);}
  const heldProgress=journey.lastProgress, heldClears=h.clears();
  for(let i=0;i<20;i++){h.tick();journey.update(.43,90);}
  assert.equal(journey.lastProgress,heldProgress,'hold the playhead while neighboring frames decode');
  assert.equal(h.clears(),heldClears,'keep the last rendered scene during a cache miss');
  assert.ok(heldClears>before,'already decoded nearby frames still animate');
  for (const target of [.43, .79, .86, .93, 1, .37]) {
    const start = journey.lastProgress;
    for (let i = 0; i < 650 && Math.abs(journey.lastProgress-target)>=.00002; i++) { await h.settle(); h.tick(); journey.update(target, 30); }
    assert.ok(Math.abs(journey.lastProgress - target) < .00002, `settles at ${target}`);
    assert.notEqual(journey.lastProgress, start);
    if(target===1)assert.equal(h.section.dataset.phase,'container-handoff','the cargo stays for the ship reveal');
  }
  assert.equal(h.section.dataset.loaded, 'false', 'reverse scroll restores the empty trailer');
});

test('timed pickup, placement and release finish within three seconds at 30, 60 and 120 Hz', async()=>{
  for(const fps of [30,60,120]){
    const h=harness(),journey=new h.window.FreightJourney(h.section,false);
    await h.settle();
    journey.cranePlayback={started:0,from:0,duration:2800};
    let previous=0,elapsed=0;
    for(let i=0;i<Math.ceil(2800*fps/1000)+1;i++){
      await h.settle();h.tick(1000/fps);elapsed+=1000/fps;journey.update(.50,99);
      assert.ok(journey.lastProgress>=previous,'forward playback never reverses');
      previous=journey.lastProgress;
      if(previous===.50)break;
    }
    assert.equal(journey.lastProgress,.50,'placement and spreader release finish');
    assert.ok(elapsed<=3000,'duration follows elapsed time, not frame count');
    assert.ok(journey.cranePaints>=Math.floor(2.7*fps),'render a new pose each display frame');
    assert.equal(journey.section.dataset.loaded,'true');
  }
});

test('timed crane playback keeps advancing through delayed image decodes',async()=>{
  const h=harness(),journey=new h.window.FreightJourney(h.section,false);
  await h.settle();
  journey.cranePlayback={started:0,from:0,duration:2800};
  for(let i=0;i<168;i++){h.tick(1000/60);journey.update(.50,99);}
  h.tick(1);journey.update(.50,99);
  assert.equal(journey.lastProgress,.50,'pending intermediate images cannot extend the animation');
  assert.ok(h.clears()>=168,'decoded fallback poses still paint on each tick');
});

test('truck settles within 200ms and keeps moving while turn frames are pending', async()=>{
  const h=harness(),journey=new h.window.FreightJourney(h.section,false);
  await h.settle();h.tick();journey.update(.79,0);
  const before=h.clears();
  // Deliberately leave newly requested turn frames undecoded.
  for(let i=0;i<12;i++){h.tick();journey.update(.84,40);}
  assert.ok(h.clears()>before+4,'ready fallback artwork must allow the road/camera to keep moving');
  assert.ok(Math.abs(journey.lastProgress-.84)<.003,'truck follows a scroll step within 200ms');
  assert.equal(journey.turn.ready(),false,'test exercises an actual pending target frame');
  for(let i=0;i<12;i++){h.tick();journey.update(.79,40);}
  assert.ok(Math.abs(journey.lastProgress-.79)<.003,'reverse gestures respond just as quickly');
});

test('fractional truck poses blend both frames with correct transparent-edge weights',()=>{
  const h=harness(),sequence=new h.window.SequenceForTest(['a','b'],()=>{});
  const lower={width:1024,height:288},upper={width:1024,height:288},draws=[];
  const ctx={clearRect(){},drawImage(image){draws.push({image,alpha:this.globalAlpha,mode:this.globalCompositeOperation});}};
  sequence.cache=new Map([[0,{image:lower,ready:true}],[1,{image:upper,ready:true}]]);
  sequence.blendCanvas={width:1024,height:288,getContext:()=>ctx};
  sequence.position=.25;
  assert.equal(sequence.blendedImage(),sequence.blendCanvas);
  assert.deepEqual(draws,[{image:lower,alpha:.75,mode:'source-over'},{image:upper,alpha:.25,mode:'lighter'}]);
  assert.equal(ctx.globalAlpha,1);
  assert.equal(ctx.globalCompositeOperation,'source-over');
  sequence.position=1;
  assert.equal(sequence.blendedImage(),upper,'exact endpoints retain the original image');
});
