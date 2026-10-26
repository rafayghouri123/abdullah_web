import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Script from 'next/script';

// Keep the original scene markup intact. Its class names and nested canvases are
// coordinate targets for the scroll renderers, so JSX normalization would change
// animation layout and frame alignment.
const original = readFileSync(join(process.cwd(), 'content', 'home.html'), 'utf8');
const contact = readFileSync(join(process.cwd(), 'content', 'contact.html'), 'utf8');
const introRoute = `<div class="intro-route" role="img" aria-label="A shipment travels from Karachi Port through customs clearance and continues on the road.">
  <div class="intro-route__meta" aria-hidden="true"><span>THE PATH FORWARD</span><span>KHI / WORLDWIDE</span></div>
  <div class="intro-route__title" aria-hidden="true">FROM PORT<br>TO PROGRESS<span>.</span></div>
  <div class="intro-route__map" aria-hidden="true">
    <svg class="intro-route__svg" viewBox="0 0 500 310" preserveAspectRatio="xMidYMid meet">
      <path class="intro-route__track" d="M44 40 C145 40 132 144 265 144 S471 170 433 224 C400 276 184 247 97 277"/>
      <path class="intro-route__line" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M44 40 C145 40 132 144 265 144 S471 170 433 224 C400 276 184 247 97 277"><animate class="intro-route__draw" attributeName="stroke-dashoffset" from="1" to="0" dur="3s" begin="indefinite" fill="freeze" calcMode="linear"/></path>
      <circle class="intro-route__node intro-route__node--one" cx="44" cy="40" r="5"/>
      <circle class="intro-route__node intro-route__node--two" cx="265" cy="144" r="5"/>
      <circle class="intro-route__node intro-route__node--three" cx="97" cy="277" r="5"/>
      <g class="intro-route__marker"><animateMotion class="intro-route__motion" path="M44 40 C145 40 132 144 265 144 S471 170 433 224 C400 276 184 247 97 277" dur="3s" begin="indefinite" fill="freeze" calcMode="linear"/><rect x="-12" y="-8" width="24" height="16" rx="1"/><path d="M-7 -5v10M-2 -5v10M3 -5v10M8 -5v10"/></g>
    </svg>
    <div class="intro-route__stop intro-route__stop--one"><span>01 / ORIGIN</span><strong>KARACHI PORT</strong></div>
    <div class="intro-route__stop intro-route__stop--two"><span>02 / PROCESS</span><strong>CUSTOMS CLEARED</strong></div>
    <div class="intro-route__stop intro-route__stop--three"><span>03 / ONWARD</span><strong>ON THE ROAD</strong></div>
  </div>
  <div class="intro-route__foot" aria-hidden="true"><span>CLEARING THE WAY FOR WHAT'S NEXT</span><span>↘</span></div>
</div>`;
const introAnchor = /(<div class="home-intro-stick-wrap"[^>]*>)/;
if (!introAnchor.test(original)) throw new Error('Intro route anchor missing');
const home = original.replace(introAnchor, `$1${introRoute}`);
const introCopyAnchor = /<div class="home-intro-desc"><div class="txt fs-28 fs-20-mb fw-med" data-wf--text--text-styles="standard">([\s\S]*?)<\/div><\/div>/;
const introCopy = home.match(introCopyAnchor)?.[1].split('<br/><br/>');
if (introCopy?.length !== 2) throw new Error('Intro copy anchor missing');
const introStory = `<div class="home-intro-desc intro-story"><span class="intro-story__rail" aria-hidden="true"></span>${introCopy.map(paragraph => `<div class="txt fs-28 fs-20-mb fw-med intro-story__paragraph" data-wf--text--text-styles="standard">${paragraph}</div>`).join('')}</div>`;
const withStory = home.replace(introCopyAnchor, () => introStory);
const contactStart = withStory.indexOf('<div class="home-cta-wrap" id="contact">');
const contactEnd = withStory.indexOf('<div class="footer-wrap"', contactStart);
if (contactStart < 0 || contactEnd < 0) throw new Error('Contact section anchor missing');
const markup = withStory.slice(0, contactStart) + contact + withStory.slice(contactEnd);

export default function HomePage() {
  return <>
    <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: markup }} />
    <Script src="/contact.js" strategy="afterInteractive" />
    <Script id="united-carriers-animations" strategy="afterInteractive">
      {`if (!window.__unitedCarriersAnimationsLoaded) {
        window.__unitedCarriersAnimationsLoaded = true;
        for (const path of ['/frames.js', '/globe.js', '/freight-assets.js', '/freight.js', '/sea-air.js', '/crane-scroll.js', '/intro-route.js', '/recreation.js']) {
          const script = document.createElement('script');
          script.src = path;
          script.async = false;
          document.body.appendChild(script);
        }
      }`}
    </Script>
  </>;
}
