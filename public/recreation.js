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
$$('.home-intro-title,.intro-story__paragraph,.home-intro-stats-item,.home-testi-text-wrap,.home-testi-item,.home-ins-text-wrap,.home-faq-text-wrap,.home-cta-wrap .heading').forEach(el=>{el.classList.add('reveal');observer.observe(el)});
const bar=document.createElement('div');bar.className='scroll-progress';document.body.appendChild(bar);
const journey = new window.FreightJourney(document.querySelector('.freight-journey'), reduced);
const craneScroll = new window.CraneScroll(journey, reduced);
// Geographic globe shares the hero's visibility-aware animation loop.
const globeController = document.querySelector('#globe') ? new window.UnitedGlobe(document.querySelector('#globe'), reduced) : null;
const resizeGlobe = () => globeController?.resize();
const drawGlobe = (t, progress) => globeController?.draw(t, progress);
const hero=$('.home-hero-wrap'),heroText=$('.home-hero-text-wrap'),heroGlobe=$('.home-hero-globe');
const sea=$('.ocean-sequence');
const seaAir = new window.SeaAirJourney(sea, reduced);
let lastY=-1,lastTime=0,velocity=0,renderTime=0,heroProgress=0;
let frameWindow=0,frameCount=0,frameWork=0;
function render(t){requestAnimationFrame(render);if(document.hidden)return;craneScroll.beforeUpdate();const y=scrollY,changed=y!==lastY;
const workStart=performance.now();
if(!frameWindow || t-frameWindow>2000){frameWindow=t;frameCount=0;frameWork=0;}
frameCount++;
if(t-frameWindow>=1000){document.documentElement.dataset.animationFps=String(Math.round(frameCount*1000/(t-frameWindow)));document.documentElement.dataset.animationWorkMs=(frameWork/frameCount).toFixed(2);frameWindow=t;frameCount=0;frameWork=0;}
// Read scene geometry together before changing transforms or canvas styles.
const heroBounds=hero.getBoundingClientRect(),freightBounds=journey.section.getBoundingClientRect(),seaBounds=sea.getBoundingClientRect();
const freightHeight=journey.section.offsetHeight,seaHeight=sea.offsetHeight;
const hp=clamp(-heroBounds.top/innerHeight);
const dt=Math.min(50,renderTime?t-renderTime:16.67);renderTime=t;
heroProgress += (hp-heroProgress)*(1-Math.exp(-dt/90));
if(heroBounds.bottom>0)drawGlobe(t,heroProgress);
if(!reduced){const heroEase=heroProgress*heroProgress*(3-2*heroProgress);
transform(heroGlobe,`translateY(${heroEase*8}vh) scale(${1+heroEase*.2})`);transform(heroText,`translateY(${-heroEase*6}vh)`);opacity(heroText,1-heroEase);}
journey.update(craneScroll.active ? .50 : window.FreightJourney.timelineProgress(clamp(-freightBounds.top/(freightHeight-innerHeight*2))), velocity);
craneScroll.afterUpdate();
seaAir.update(t,seaBounds,seaHeight);
frameWork+=performance.now()-workStart;
if(!changed&&t-lastTime>400)return;velocity+=(Math.min(99,Math.abs(y-lastY)*2)-velocity)*.15;lastY=y;if(changed)lastTime=t;
bar.style.width=100*y/Math.max(1,document.documentElement.scrollHeight-innerHeight)+'%';const dark=(heroBounds.bottom>80)||(seaBounds.top<80&&seaBounds.bottom>80);header?.classList.toggle('on-scroll',y>60);header?.classList.toggle('on-dark',dark);

}
requestAnimationFrame(render);
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{journey.resize();seaAir.resize();resizeGlobe();lastY=-1},150)});
})();
// Accessible controls for the recreated navigation and footer.
(() => {
 const dropdown=document.querySelector('.header-dropdown');
 if(dropdown){const close=document.createElement('button');close.className='replica-menu-close';close.textContent='CLOSE ×';close.setAttribute('aria-label','Close menu');close.onclick=()=>{document.querySelector('.header').classList.remove('show-menu','on-open-nav');document.querySelector('.header-menu-toggle').classList.remove('active');document.querySelector('.header-menu-toggle').setAttribute('aria-expanded','false');dropdown.classList.remove('active')};dropdown.prepend(close)}
 const buttons=[...document.querySelectorAll('.footer-info-btn')],panels=[...document.querySelectorAll('.footer-info-text-inner')];buttons.forEach((button,index)=>{button.setAttribute('aria-pressed',String(index===0));button.addEventListener('click',()=>{buttons.forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',String(i===index))});panels.forEach((p,i)=>p.classList.toggle('active',i===index))})});
 const cookies=document.querySelector('.cky-banner-element');if(cookies){const dialog=document.createElement('dialog');dialog.className='cookie-dialog';dialog.innerHTML='<h2>Cookie settings</h2><p>This website does not use analytics or advertising cookies.</p><form method="dialog"><button>Close</button></form>';document.body.appendChild(dialog);cookies.addEventListener('click',()=>dialog.showModal())}
})();
