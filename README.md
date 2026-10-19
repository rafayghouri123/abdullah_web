# United Carriers recreation

A standalone visual recreation of the United Carriers homepage, with locally hosted artwork and fonts, a rotating globe, scroll-controlled crane and truck frame sequences, horizontal services, ocean and aircraft transitions, responsive navigation, FAQ accordions, and footer tabs.

## Run

Install Node.js, then run `npm start` in this directory. Open http://127.0.0.1:4173.
There are no npm dependencies and no build step. The deployable site is in `dist/`.

## Edit

- `dist/index.html`: page markup and reference content.
- `dist/recreation.css`: responsive presentation and scene layout.
- `dist/recreation.js`: independent animation and interaction implementation.
- `dist/frames.js`: local animation-frame manifests.
- `dist/assets/`: public reference artwork, fonts, and base styling.

## Scope and provenance

Reference: https://unitedcarriers.com/ (retrieved 19 October 2026).
This is a homepage recreation, not the company's operational website. Navigation targets the corresponding homepage sections. News, merchandise, policy, social, and contact links lead to their original destinations. No forms submit data and there is no payment backend.

The source animation bundle contains a domain restriction and is not included or executed. Scroll playback, globe rendering, transitions, and interactions have been implemented independently. Public crane and truck frame artwork is retained, but overall timing, globe rendering, and some transitions are approximations rather than a verified pixel-perfect reproduction. Company copy, identity, fonts, and artwork retain their respective ownership. Search indexing is disabled.

The page respects reduced-motion preferences and uses a bounded frame-image cache rather than decoding the entire sequence into memory.
