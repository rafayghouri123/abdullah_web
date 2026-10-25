import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Script from 'next/script';

// Keep the original scene markup intact. Its class names and nested canvases are
// coordinate targets for the scroll renderers, so JSX normalization would change
// animation layout and frame alignment.
const original = readFileSync(join(process.cwd(), 'content', 'home.html'), 'utf8');
const contact = readFileSync(join(process.cwd(), 'content', 'contact.html'), 'utf8');
const contactStart = original.indexOf('<div class="home-cta-wrap" id="contact">');
const contactEnd = original.indexOf('<div class="footer-wrap"', contactStart);
if (contactStart < 0 || contactEnd < 0) throw new Error('Contact section anchor missing');
const markup = original.slice(0, contactStart) + contact + original.slice(contactEnd);

export default function HomePage() {
  return <>
    <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: markup }} />
    <Script src="/contact.js" strategy="afterInteractive" />
    <Script id="united-carriers-animations" strategy="afterInteractive">
      {`if (!window.__unitedCarriersAnimationsLoaded) {
        window.__unitedCarriersAnimationsLoaded = true;
        for (const path of ['/frames.js', '/globe.js', '/freight-assets.js', '/freight.js', '/sea-air.js', '/crane-scroll.js', '/recreation.js']) {
          const script = document.createElement('script');
          script.src = path;
          script.async = false;
          document.body.appendChild(script);
        }
      }`}
    </Script>
  </>;
}
