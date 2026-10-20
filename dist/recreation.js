/* Independent, dependency-free scroll renderer. */
(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const progress=(el)=>el?clamp(-el.getBoundingClientRect().top/(el.offsetHeight-innerHeight)):0;
const transform=(el,value)=>{if(el)el.style.transform=value};
const opacity=(el,value)=>{if(el)el.style.opacity=clamp(value)};
const header=$('.header'),menu=$('.header-menu-toggle');
function closeMenu(){header?.classList.remove('show-menu','on-open-nav');menu?.classList.remove('active');$('.header-dropdown')?.classList.remove('active');menu?.setAttribute('aria-expanded','false')}
if(menu){menu.setAttribute('role','button');menu.setAttribute('tabindex','0');menu.setAttribute('aria-expanded','false');const toggle=()=>{const open=!header.classList.contains('show-menu');header.classList.toggle('show-menu',open);header.classList.toggle('on-open-nav',open);menu.classList.toggle('active',open);$('.header-dropdown')?.classList.toggle('active',open);menu.setAttribute('aria-expanded',String(open))};menu.addEventListener('click',toggle);menu.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}})}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
$$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const h=a.getAttribute('href');if(h.length<2)return;const el=$(h);if(el){e.preventDefault();closeMenu();el.scrollIntoView({behavior:reduced?'instant':'smooth'});history.replaceState(null,'',h)}}));
$$('.home-faq-main-item').forEach((item,i)=>{const title=item.querySelector('.home-faq-main-item-title-wrap'),answer=item.querySelector('.home-faq-main-item-ans'),num=item.querySelector('.home-faq-main-item-number .txt');if(num)num.textContent=String(i+1).padStart(2,'0');if(!title||!answer)return;answer.id='faq-answer-'+i;title.setAttribute('role','button');title.setAttribute('tabindex','0');title.setAttribute('aria-expanded','false');title.setAttribute('aria-controls',answer.id);answer.setAttribute('aria-hidden','true');function toggle(){const open=!item.classList.contains('open');item.classList.toggle('open',open);title.setAttribute('aria-expanded',String(open));answer.setAttribute('aria-hidden',String(!open))}title.addEventListener('click',toggle);title.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}})});
$$('.footer-tab-item,.footer-tab').forEach(el=>el.addEventListener('click',()=>el.classList.toggle('active')));
// Reveal content as it enters the viewport.
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in-view');observer.unobserve(e.target)}}),{threshold:.08});
$$('.home-intro-title,.home-intro-desc,.home-intro-stats-item,.home-testi-text-wrap,.home-testi-item,.home-ins-text-wrap,.home-faq-text-wrap,.home-cta-wrap .heading').forEach(el=>{el.classList.add('reveal');observer.observe(el)});
const bar=document.createElement('div');bar.className='scroll-progress';document.body.appendChild(bar);
// Bounded frame cache: decode just the neighbourhood of the scroll playhead.
class FramePlayer{
 constructor(canvas,urls){this.canvas=canvas;this.urls=urls||[];this.ctx=canvas?.getContext('2d');this.cache=new Map;this.queue=[];this.loading=0;this.index=0;this.lastDraw=-1;this.resize();this.seek(0)}
 resize(){if(!this.canvas)return;const r=this.canvas.getBoundingClientRect();const d=Math.min(devicePixelRatio,1.5);this.canvas.width=Math.max(1,Math.round(r.width*d));this.canvas.height=Math.max(1,Math.round(r.height*d));this.lastDraw=-1;this.draw()}
 seek(p){if(!this.urls.length||!this.canvas)return;this.index=Math.round(clamp(p)*(this.urls.length-1));const wanted=[this.index];for(let i=1;i<7;i++)wanted.push(this.index+i,this.index-i);this.queue=wanted.filter(i=>i>=0&&i<this.urls.length&&!this.cache.has(i));this.load();this.draw();if(this.cache.size>32)for(const k of this.cache.keys())if(Math.abs(k-this.index)>14)this.cache.delete(k)}
 load(){while(this.loading<4&&this.queue.length){const i=this.queue.shift();if(this.cache.has(i))continue;const img=new Image;this.cache.set(i,img);this.loading++;img.decoding='async';const complete=()=>{this.loading--;this.draw();this.load()};img.onload=complete;img.onerror=complete;img.src=this.urls[i]}}
 draw(){if(!this.ctx)return;let index=this.index;let img=this.cache.get(index);if(!img?.complete||!img.naturalWidth){let distance=1e6;for(const [i,candidate]of this.cache){if(candidate.complete&&candidate.naturalWidth&&Math.abs(i-this.index)<distance){distance=Math.abs(i-this.index);img=candidate;index=i}}}if(!img?.naturalWidth||this.lastDraw===index)return;this.lastDraw=index;const w=this.canvas.width,h=this.canvas.height,k=Math.min(w/img.naturalWidth,h/img.naturalHeight);this.ctx.clearRect(0,0,w,h);this.ctx.drawImage(img,(w-img.naturalWidth*k)/2,(h-img.naturalHeight*k)/2,img.naturalWidth*k,img.naturalHeight*k)}
}
const frames=window.JOURNEY_FRAMES||{};
const crane=new FramePlayer($('#crane-canvas'),[...(frames.lift||[]),...(frames.rotate||[]),...(frames.place||[])]);
const truck=new FramePlayer($('#truck-turn'),frames.truck);
// Geographic globe shares the hero's visibility-aware animation loop.
const globeController = document.querySelector('#globe') ? new window.UnitedGlobe(document.querySelector('#globe'), reduced) : null;
const resizeGlobe = () => globeController?.resize();
const drawGlobe = (t, progress) => globeController?.draw(t, progress);
const hero=$('.home-hero-wrap'),heroText=$('.home-hero-text-wrap'),heroGlobe=$('.home-hero-globe');
const craneSection=$('.crane-sequence'),road=$('.road-sequence'),horizontal=$('.services-horizontal'),drive=$('.driving-truck'),turn=$('#truck-turn');
const sea=$('.ocean-sequence'),seaReasons=$('.ocean-reasons'),ship=$('.freight-ship'),flight=$('.flight-sequence');
let lastY=-1,lastTime=0,velocity=0,lastFrame=0;
function render(t){requestAnimationFrame(render);if(document.hidden)return;const y=scrollY,changed=y!==lastY;const hp=progress(hero);if(t-lastFrame>32&&hero.getBoundingClientRect().bottom>0){drawGlobe(t,hp);lastFrame=t}
if(!changed&&t-lastTime>400)return;velocity+=(Math.min(99,Math.abs(y-lastY)*2)-velocity)*.15;lastY=y;if(changed)lastTime=t;
bar.style.width=100*y/Math.max(1,document.documentElement.scrollHeight-innerHeight)+'%';const dark=(hero.getBoundingClientRect().bottom>80)||(sea.getBoundingClientRect().top<80&&sea.getBoundingClientRect().bottom>80);header?.classList.toggle('on-scroll',y>60);header?.classList.toggle('on-dark',dark);
if(reduced){crane.seek(.45);return}
transform(heroGlobe,`translateY(${hp*20}vh) scale(${1+hp*.8})`);transform(heroText,`translateY(${-hp*20}vh)`);opacity(heroText,1-hp*1.5);
const cp=progress(craneSection);if(craneSection.getBoundingClientRect().top<innerHeight*2&&craneSection.getBoundingClientRect().bottom>0)crane.seek(clamp((cp-.08)/.86));transform($('.sequence-label'),`translateX(${-cp*20}vw)`);
const rp=progress(road),travel=clamp((rp-.03)/.79);const distance=Math.max(0,horizontal.scrollWidth-innerWidth+innerWidth*.05);transform(horizontal,`translateX(${-travel*distance}px)`);transform($('.road-word'),`translateX(${-rp*150}vw)`);transform($('.road-dashes'),`translateX(${-rp*100}vw)`);transform(drive,`translateX(${Math.sin(rp*5)*3}vw)`);const turning=clamp((rp-.84)/.16);opacity(drive,1-turning*5);opacity(turn,turning*5);if(turning>0)truck.seek(turning);$('.speed span').textContent=String(Math.round(velocity)).padStart(2,'0');
const sp=progress(sea);transform(ship,`translateY(${(1-sp)*30-15}vh) scale(${1-sp*.18})`);transform($('.ocean-texture'),`translateY(${sp*12-6}%)`);opacity($('.ocean-heading'),1-sp*5);transform($('.ocean-heading'),`translateY(${-sp*30}vh)`);const sd=seaReasons.scrollWidth+innerWidth;transform(seaReasons,`translateX(${-clamp((sp-.13)/.70)*sd}px)`);const clouds=clamp((sp-.82)/.18);transform($('.cloud-left'),`translate(${clouds*65}vw,${clouds*35}vh)`);transform($('.cloud-right'),`translate(${-clouds*75}vw,${-clouds*25}vh)`);
const fp=progress(flight);transform($('.airplane'),`translate(${fp*10-10}vw,${25-fp*80}vh) rotate(${-12+fp*20}deg) scale(${.7+fp*.5})`);transform($('.cloud-a'),`translate(${fp*100}vw,${fp*20}vh)`);transform($('.cloud-b'),`translate(${-fp*100}vw,${-fp*10}vh)`);opacity($('.flight-copy'),1-fp*1.8)
}
requestAnimationFrame(render);
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{crane.resize();truck.resize();resizeGlobe();lastY=-1},150)});
// Make the source-site links intentional and keep this recreation self-contained.
const note=document.createElement('div');note.className='replica-note';note.innerHTML='Visual recreation of <a href="https://unitedcarriers.com/" target="_blank" rel="noopener">United Carriers</a>. Company information and artwork belong to their respective owners.';document.body.appendChild(note);
})();
// Accessible controls for the recreated navigation and footer.
(() => {
 const dropdown=document.querySelector('.header-dropdown');
 if(dropdown){const close=document.createElement('button');close.className='replica-menu-close';close.textContent='CLOSE ×';close.setAttribute('aria-label','Close menu');close.onclick=()=>{document.querySelector('.header').classList.remove('show-menu','on-open-nav');document.querySelector('.header-menu-toggle').classList.remove('active');document.querySelector('.header-menu-toggle').setAttribute('aria-expanded','false');dropdown.classList.remove('active')};dropdown.prepend(close)}
 const buttons=[...document.querySelectorAll('.footer-info-btn')],panels=[...document.querySelectorAll('.footer-info-text-inner')];buttons.forEach((button,index)=>{button.setAttribute('aria-pressed',String(index===0));button.addEventListener('click',()=>{buttons.forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',String(i===index))});panels.forEach((p,i)=>p.classList.toggle('active',i===index))})});
 const cookies=document.querySelector('.cky-banner-element');if(cookies){const dialog=document.createElement('dialog');dialog.className='cookie-dialog';dialog.innerHTML='<h2>Cookie settings</h2><p>This recreation does not use analytics or advertising cookies.</p><form method="dialog"><button>Close</button></form>';document.body.appendChild(dialog);cookies.addEventListener('click',()=>dialog.showModal())}
})();
