# United Carriers recreation

A standalone visual recreation of the United Carriers homepage, with locally hosted artwork and fonts, an interactive globe with country labels, scroll-controlled crane and truck frame sequences, horizontal services, ocean and aircraft transitions, responsive navigation, FAQ accordions, and footer tabs.

## Run

Install Node.js, then run `npm start` in this directory. Open http://127.0.0.1:4173.
There are no npm dependencies and no build step. The deployable site is in `dist/`.

## Edit

- `dist/index.html`: page markup and reference content.
- `dist/recreation.css`: responsive presentation and scene layout.
- `dist/recreation.js`: independent animation and interaction implementation.
- `dist/globe.js`: drag, touch and keyboard globe controls, geographic dots, country labels and animated routes.
- `dist/globe-data.json`: locally hosted land coordinates and the reference's 25 country pins and 20 routes.
- `dist/frames.js`: local animation-frame manifests.
- `dist/assets/`: public reference artwork, fonts, and base styling.

## Scope and provenance

Reference: https://unitedcarriers.com/ (retrieved 19 October 2026).
This is a homepage recreation, not the company's operational website. Navigation targets the corresponding homepage sections. News, merchandise, policy, social, and contact links lead to their original destinations. No forms submit data and there is no payment backend.

The source animation bundle contains a domain restriction and is not included or executed. Scroll playback, globe rendering, transitions, and interactions have been implemented independently. Public crane and truck frame artwork is retained, but overall timing, globe rendering, and some transitions are approximations rather than a verified pixel-perfect reproduction. Company copy, identity, fonts, and artwork retain their respective ownership. Search indexing is disabled.

The page respects reduced-motion preferences and uses a bounded frame-image cache rather than decoding the entire sequence into memory.

Globe land geometry uses Natural Earth via world-atlas (`https://unpkg.com/world-atlas@2/land-110m.json`). Geographic data is stored locally; visitors do not contact an external map service. Country pin coordinates and route endpoints follow the reference globe. Drag horizontally on touch screens; vertical gestures keep page scrolling. On desktop, drag in any direction, use arrow keys, press Space to pause, or Home to reset.
