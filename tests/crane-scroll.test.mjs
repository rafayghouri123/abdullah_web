import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function harness(reduced=false){
  const listeners={},style={overflow:'clip',scrollBehavior:'smooth'};
  const context={window:{},performance:{now:()=>context.time},time:0,scrollY:900,innerHeight:720,
    document:{documentElement:{style},addEventListener:()=>{}},
    addEventListener:(name,handler)=>{listeners[name]=handler;},
    scrollTo:({top})=>{context.scrollY=top;},Image:class{}};
  vm.createContext(context);
  for(const name of ['freight','crane-scroll'])vm.runInContext(fs.readFileSync(new URL(`../public/${name}.js`,import.meta.url),'utf8'),context);
  const journey={lastProgress:0,section:{dataset:{},offsetHeight:7200,getBoundingClientRect:()=>({top:1000-context.scrollY})}};
  const gate=new context.window.CraneScroll(journey,reduced);
  return {context,journey,gate,listeners,style};
}

test('fast scrolling locks until placement and release complete, then restores scrolling',()=>{
  const h=harness();
  assert.equal(h.gate.input(110),false,'gentle entry scroll remains native');
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

test('reverse scrolling, Escape, timeout, and reduced motion cannot leave scrolling locked',()=>{
  for(const action of ['reverse','escape','timeout']){
    const h=harness();h.gate.input(2000);
    if(action==='reverse')assert.equal(h.gate.input(-100),false);
    if(action==='escape')h.listeners.keydown({key:'Escape'});
    if(action==='timeout'){h.context.time=21000;h.gate.beforeUpdate();}
    assert.equal(h.gate.active,false,action);
    assert.equal(h.style.overflow,'clip',action);
  }
  const h=harness(true);
  assert.equal(h.gate.input(5000),false);
  assert.equal(h.style.overflow,'clip');
});

test('a scrollbar jump across the crane catches the sequence before it is skipped',()=>{
  const h=harness();h.context.scrollY=7000;h.gate.beforeUpdate();
  assert.equal(h.gate.active,true);
  assert.ok(Math.abs(h.context.scrollY-1000)<1);
});
