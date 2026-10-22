# United Carriers recreation — Next.js

A Next.js App Router version of the United Carriers homepage recreation. The globe, crane and truck frame sequences, horizontal services, ocean and aircraft transition, responsive navigation, and other interactions use the original local artwork and custom renderers from this project.

## Run

```sh
npm install
npm run dev
```

Open the Local URL printed by Next.js (usually http://localhost:3000). For a production check, run `npm run build` and `npm start`. Run `npm run check` for JavaScript syntax and `npm test` for animation regressions.

## Project layout

- `app/layout.jsx`: page metadata, original stylesheets, and ordered animation loading after hydration.
- `app/page.jsx`: server-rendered homepage markup.
- `content/home.html`: original scene markup and content. Its canvas and section hierarchy are preserved for the scroll choreography.
- `public/assets/`: the original local image frames, artwork, and fonts. Files are copied byte for byte and requested directly, without image optimization or re-encoding.
- `public/frames.js`, `public/freight.js`, `public/sea-air.js`, `public/globe.js`, and `public/recreation.js`: the existing animation code. Their script order is preserved.
- `public/recreation.css`, `public/sea-air.css`, and `public/assets/reference.css`: the original presentation rules.

The page uses the App Router and React server rendering. The scene markup remains an HTML island because its exact nested structure and class names are inputs to the canvas renderers; rewriting or normalizing them would risk shifting the frame alignment. New page content can be added as React components around this scene.

## Scope

Reference: [unitedcarriers.com](https://unitedcarriers.com/). This is a visual homepage recreation, not the company's operational site. Search indexing is disabled. Original company identity, copy, fonts, and artwork retain their respective ownership. The scroll playback and interactive globe are independent implementations; some timing and transitions are approximations. Reduced-motion preferences are supported.
