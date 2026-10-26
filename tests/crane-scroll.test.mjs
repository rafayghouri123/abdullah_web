import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function harness(reduced=false, viewport={height:720, sectionHeight:7200}){
  const listeners={},style={overflow:'clip',scrollBehavior:'smooth'};
  const context={window:{},performance:{now:()=>context.time},time:0,scrollY:900,innerHeight:viewport.height,
    document:{documentElement:{style},addEventListener:()=>{}},
    addEventListener:(name,handler)=>{listeners[name]=handler;},
    scrollTo:({top})=>{context.scrollY=top;},Image:class{}};
  vm.createContext(context);
  for(const name of ['freight','crane-scroll'])vm.runInContext(fs.readFileSync(new URL(`../public/${name}.js`,import.meta.url),'utf8'),context);
  const journey={lastProgress:0,section:{dataset:{},offsetHeight:viewport.sectionHeight,getBoundingClientRect:()=>({top:1000-context.scrollY})}};
  const gate=new context.window.CraneScroll(journey,reduced);
  return {context,journey,gate,listeners,style};
}

test('entry plays the bounded crane sequence, then restores scrolling',()=>{
  const h=harness();
  assert.equal(h.gate.input(50),false,'scroll before the section remains native');
  assert.equal(h.gate.input(2000),true);
  assert.equal(h.style.overflow,'hidden');
  const lockedY=h.context.scrollY;
  assert.equal(h.gate.input(5000),true,'extra wheel input is discarded');
  h.journey.lastProgress=.46;h.gate.afterUpdate();
  assert.equal(h.gate.active,true,'wait for the spreader to release too');
  h.journey.lastProgress=.5;h.gate.afterUpdate();
  assert.equal(h.gate.active,false);
  assert.equal(h.style.overflow,'clip');
  assert.equal(h.style.scrollBehavior,'smooth');
  assert.ok(h.context.scrollY>lockedY);
  assert.equal(h.gate.input(5000),false,'completed scene does not trap subsequent scrolling');
});

test('reverse gestures remain blocked until placement finishes',()=>{
  const h=harness();h.gate.input(2000);
  const lockedY=h.context.scrollY;
  assert.equal(h.gate.input(-100),true);
  assert.equal(h.gate.active,true);
  assert.equal(h.context.scrollY,lockedY);
  h.journey.lastProgress=.50;h.gate.afterUpdate();
  assert.equal(h.gate.active,false);
  assert.equal(h.gate.input(-100),false);
});

test('Escape, timeout, and reduced motion cannot leave scrolling locked',()=>{
  for(const action of ['escape','timeout']){
    const h=harness();h.gate.input(2000);
    if(action==='escape')h.listeners.keydown({key:'Escape'});
    if(action==='timeout'){h.context.time=20001;h.gate.beforeUpdate();h.gate.afterUpdate();}
    assert.equal(h.gate.active,false,action);
    assert.equal(h.style.overflow,'clip',action);
  }
  const h=harness(true);
  assert.equal(h.gate.input(5000),false);
  assert.equal(h.style.overflow,'clip');
});

test('wheel and touch gestures are consumed throughout the original crane animation',()=>{
  for(const viewport of [{height:720,sectionHeight:7200},{height:780,sectionHeight:2808}]){
    for(const kind of ['wheel','touch']){
      const h=harness(false,viewport);let prevented=0;
      if(kind==='wheel'){
        h.listeners.wheel({deltaY:2000,deltaX:0,deltaMode:0,preventDefault(){prevented++;}});
        h.listeners.wheel({deltaY:2000,deltaX:0,deltaMode:0,preventDefault(){prevented++;}});
        h.listeners.wheel({deltaY:-2000,deltaX:0,deltaMode:0,preventDefault(){prevented++;}});
      }else{
        h.listeners.touchstart({touches:[{clientY:700}]});
        h.listeners.touchmove({touches:[{clientY:570}],preventDefault(){prevented++;}});
        h.listeners.touchmove({touches:[{clientY:470}],preventDefault(){prevented++;}});
        h.listeners.touchmove({touches:[{clientY:600}],preventDefault(){prevented++;}});
      }
      assert.equal(prevented,3,`${kind} input is blocked after the first gesture`);
      assert.equal(h.gate.active,true);
      h.journey.lastProgress=.50;h.gate.afterUpdate();
      assert.equal(h.gate.active,false);
    }
  }
});

test('a scrollbar jump across the crane catches the sequence before it is skipped',()=>{
  const h=harness();h.context.scrollY=7000;h.gate.beforeUpdate();
  assert.equal(h.gate.active,true);
  assert.ok(Math.abs(h.context.scrollY-1000)<1);
});

test('missing assets eventually release the scroll lock without skipping the animation',()=>{
  const h=harness();h.gate.input(2000);
  h.context.time=20000;h.gate.beforeUpdate();h.gate.afterUpdate();
  assert.equal(h.gate.active,true);
  h.context.time=20001;h.gate.beforeUpdate();h.gate.afterUpdate();
  assert.equal(h.gate.active,false);
  assert.equal(h.style.overflow,'clip');
  assert.equal(h.journey.lastProgress,0);
});
