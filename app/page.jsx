import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Keep the original scene markup intact. Its class names and nested canvases are
// coordinate targets for the scroll renderers, so JSX normalization would change
// animation layout and frame alignment.
const markup = readFileSync(join(process.cwd(), 'content', 'home.html'), 'utf8');

export default function HomePage() {
  return <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: markup }} />;
}
