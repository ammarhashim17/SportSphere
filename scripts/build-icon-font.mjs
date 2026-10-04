import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const EXTRA_ICONS = [
  'home',
  'search',
  'close',
  'check_circle',
  'error',
  'cloud_off',
  'sync',
  'photo_camera',
  'person',
  'groups',
  'logout',
  'visibility',
  'visibility_off',
  'edit',
  'delete',
  'more_vert',
  'arrow_back',
  'sports_cricket',
  'scoreboard',
  'shield',
  'bar_chart',
];

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const used = new Set(EXTRA_ICONS);
for (const file of walk('design/stitch').filter((f) => f.endsWith('code.html'))) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</g)) {
    used.add(m[1]);
  }
}

const codepoints = new Map(
  readFileSync('.cache/MaterialSymbolsOutlined.codepoints', 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => l.trim().split(' ')),
);

const glyphMap = {};
const unicodes = [];
for (const name of [...used].sort()) {
  const hex = codepoints.get(name);
  if (!hex) {
    console.warn(`! no codepoint for icon "${name}"`);
    continue;
  }
  glyphMap[name] = parseInt(hex, 16);
  unicodes.push(`U+${hex.toUpperCase()}`);
}

mkdirSync('assets/fonts', { recursive: true });
mkdirSync('src/theme', { recursive: true });
writeFileSync('src/theme/iconGlyphs.json', JSON.stringify(glyphMap, null, 2));

execSync(
  'fonttools varLib.instancer ".cache/MaterialSymbolsOutlined.ttf" FILL=0 wght=400 GRAD=0 opsz=24 -o .cache/instance.ttf',
  { stdio: 'inherit' },
);
execSync(
  `pyftsubset .cache/instance.ttf --unicodes="${unicodes.join(',')}" --output-file=assets/fonts/MaterialSymbolsOutlined.ttf --no-hinting`,
  { stdio: 'inherit' },
);
console.log(`Built icon font with ${unicodes.length} icons.`);
