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

## Contact form and admin inbox

The contact section includes full name, email address, shipment/enquiry type, and message. Valid submissions are saved server-side to Neon PostgreSQL. `/admin` requires authentication before any enquiry data is queried or rendered. It lists all enquiries, newest first, in pages of 20, with full messages and Pakistan timestamps.

Each enquiry starts **Open**. Use **Mark as resolved** when handled, or **Reopen enquiry** to undo it. Status is saved in Neon and survives page reloads; existing enquiries remain open. The first database access adds a nullable `resolved_at` column automatically, requiring table-owner privileges for that migration. The update endpoint checks the admin session and request origin before changing a record. Run `node scripts/verify-enquiry-status.mjs` against the local server on port 4175 for a live resolve/reopen check; it creates and removes only its own test enquiry.

1. Open `.env` in this project. The local admin username, password hash, and random session secret are already configured. Keep this file private; Git ignores it.
2. In Neon, open your project → **Connect**, copy the PostgreSQL connection string, and set `DATABASE_URL="postgresql://..."`. This is a connection string, not a Neon management API key. See [Neon's connection guide](https://neon.com/docs/get-started/connect-neon).
3. Restart the Next.js server. The `contact_enquiries` table is created automatically when the authenticated inbox or first valid submission accesses the database. The Neon database role needs permission to create this table on first use.
4. Open `/admin` and sign in using the credentials supplied for this project. To change the password, run `npm run admin:password`, copy the resulting hash into `.env`, and restart. Existing sessions become invalid when the password hash or session secret changes.

For another deployment, configure `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `ADMIN_SESSION_SECRET` as private environment variables using `.env.example` as a guide. Never use `NEXT_PUBLIC_` for these values. Serve production over HTTPS: session cookies are HttpOnly, SameSite=Strict, Secure on HTTPS, and expire after eight hours. Sign-out clears the browser's cookie. Enquiry values use parameterized queries and render as escaped text.

Both form validation and request size limits run on the server. Login attempts and contact submissions have a bounded per-process rate limit; for multiple server instances, configure a shared or edge rate limiter. Login is limited to 15 attempts per 15 minutes for this single-admin site. Database failures return an error and preserve the visitor's form fields. A successful UI message is shown only after the insert succeeds.

Without `DATABASE_URL`, admin sign-in still works and shows setup guidance; contact submissions report that they could not be saved. Live Neon persistence must be verified after supplying the connection string: submit a test enquiry, confirm it in `/admin`, then sign out and confirm the inbox is inaccessible.

## Original recreation scope

Reference: [unitedcarriers.com](https://unitedcarriers.com/). This is a visual homepage recreation, not the company's operational site. Search indexing is disabled. Original company identity, copy, fonts, and artwork retain their respective ownership. The scroll playback and interactive globe are independent implementations; some timing and transitions are approximations. Reduced-motion preferences are supported.

Crane pickup, placement and spreader release use a 2.8-second wall-clock timeline on entry. Playback runs on requestAnimationFrame, targeting 60 fps on a 60 Hz display. Delayed image decodes cannot extend the hold: the renderer blends the closest decoded poses and releases scrolling at the deadline. Reverse input or Escape cancels playback; reduced motion bypasses it. Wheel, touch, keyboard and scrollbar jumps are handled by public/crane-scroll.js. The freight section exposes data-crane-duration-ms and data-crane-fps for measured timing and rendered-pose cadence.

Pacing update: crane loading/release uses 10% of the freight scroll track (previously 24.3%). The reliability copy finishes its full vertical travel by phase .965, remains fully opaque for a reading hold, and only then fades into docking. Crane frames use eased phase movement, blending, and a bounded directional lookahead of 30 frames. Lossless WebP playback copies in public/assets/crane-playback retain the rendered detail at up to 1536px; larger canvases use the original AVIFs. Regenerate the playback copies with node scripts/prepare-crane-playback.mjs. Original artwork files remain unchanged. The globe renders on each animation frame, interpolates route-marker positions, and smooths its scroll response and country labels.

Truck/aircraft playback: truck turn frames are alpha blended between adjacent poses, with time-based scroll smoothing. Sea animation is no longer capped at 30 fps. Ship and aircraft sizes are set on resize, and movement uses transforms. Aircraft and all eight clouds share a transparent WebGL compositor, with original source textures and shadows/blur cached at source resolution; image layers remain a fallback if WebGL is unavailable or its context is lost. Assets in public/assets are unchanged. The animation loop follows the display refresh rate, targeting 60 Hz; actual presentation depends on browser/GPU throughput. The root element exposes data-animation-fps (loop cadence) and data-animation-work-ms (average update work) for diagnostics. The in-app preview reached 60 fps in the truck section but still dipped below 60 in the sea/air overlap during validation.
