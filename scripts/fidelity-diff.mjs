// Visual aid for the UI Fidelity Lock (LOCK-06). Usage:
//   node scripts/fidelity-diff.mjs design/stitch/live_match_scoring/screen.png path/to/device-screenshot.png [diff.png]
// Both images are scaled to 390 px wide and compared over the height of the shorter one.
// The percentage is a guide for the reviewer, NOT a pass/fail gate: the owner signs off by eye.
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const W = 390;
const [stitchPath, devicePath, outPath = 'fidelity-diff.png'] = process.argv.slice(2);
if (!stitchPath || !devicePath) {
  console.error('usage: node scripts/fidelity-diff.mjs <stitch.png> <device.png> [diff.png]');
  process.exit(1);
}

const scaled = async (file) => {
  const buf = await sharp(file).resize({ width: W }).png().toBuffer();
  const meta = await sharp(buf).metadata();
  return { buf, height: meta.height ?? 0 };
};
const [a, b] = await Promise.all([scaled(stitchPath), scaled(devicePath)]);
const H = Math.min(a.height, b.height);
const raw = async (img) =>
  sharp(img.buf).extract({ left: 0, top: 0, width: W, height: H }).ensureAlpha().raw().toBuffer();
const [ra, rb] = await Promise.all([raw(a), raw(b)]);

const diff = new PNG({ width: W, height: H });
const changed = pixelmatch(ra, rb, diff.data, W, H, { threshold: 0.12, includeAA: false });
writeFileSync(outPath, PNG.sync.write(diff));
const pct = ((changed / (W * H)) * 100).toFixed(2);
console.log(`Compared ${W}x${H}px  |  differing pixels: ${changed} (${pct}%)  |  diff image: ${outPath}`);
if (a.height !== b.height) console.log(`Note: heights differ (stitch ${a.height}px, device ${b.height}px) — compared the top ${H}px only.`);
