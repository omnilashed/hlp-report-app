import { cp, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public/ocr');
await mkdir(out, { recursive: true });
await cp(resolve(root, 'node_modules/tesseract.js/dist/worker.min.js'), resolve(out, 'worker.min.js'));
const core = resolve(root, 'node_modules/tesseract.js-core');
for (const name of await readdir(core)) {
  if (/\.wasm(?:\.js)?$/.test(name)) await cp(resolve(core, name), resolve(out, name));
}
await cp(resolve(root, 'node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz'), resolve(out, 'eng.traineddata.gz'));
