import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('the ship cargo holds its screen position throughout forward and reverse road wipes', () => {
  for (const [width,height] of [[1280,720],[390,844]]) {
    let top=height,time=0;
    const elements=new Map();
    const section={offsetHeight:height*8,dataset:{},getBoundingClientRect:()=>({top,bottom:top+height*8}),
      querySelector(selector){if(!elements.has(selector))elements.set(selector,{style:{},clientWidth:width,getContext:()=>null});return elements.get(selector);},
      querySelectorAll:()=>Array.from({length:8},()=>({style:{}}))};
    const window={};
    vm.runInNewContext(fs.readFileSync(new URL('../public/sea-air.js',import.meta.url),'utf8'),{window,innerHeight:height});
    const journey=new window.SeaAirJourney(section,false);
    for(const position of [height,height*.75,height*.5,height*.25,0,-height*3,height*.25,height*.5,height]){
      top=position;
      for(let i=0;i<100;i++)journey.update(time+=16.67);
      if(top<0)continue;
      const ship=elements.get('.freight-ship');
      const [x,y]=ship.style.transform.match(/translate3d\(([^p]+)px,([^p]+)px/).slice(1).map(Number);
      assert.equal(x,width/2);
      assert.equal(y+top,height/2,'cargo must not move with the rising sea section');
      assert.equal(parseFloat(ship.style.height),height*2.5,'no scale jump at the truck/ship boundary');
      assert.equal(elements.get('.ocean-heading').style.opacity,0,'copy must not cover the container handoff');
    }
  }
});
