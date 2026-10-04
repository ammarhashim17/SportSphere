import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import tokens from '../tokens.json';

function findHtml(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory()
      ? findHtml(p)
      : p.endsWith('code.html') && !p.includes('scoresphere_logo')
        ? [p]
        : [];
  });
}

function stitchConfig(file: string) {
  const html = readFileSync(file, 'utf8');
  const m = html.match(/tailwind\.config\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/);
  if (!m) throw new Error(`No tailwind config in ${file}`);
  return new Function(`return (${m[1]});`)() as {
    theme: { extend: Record<string, Record<string, unknown>> };
  };
}

const root = join(__dirname, '../../../design/stitch');
const files = existsSync(root) ? findHtml(root) : [];

describe('tokens.json matches the Stitch Tailwind config (LOCK-02)', () => {
  it('finds Stitch screens', () => expect(files.length).toBeGreaterThan(0));

  it.each(files)('%s', (file) => {
    const ext = stitchConfig(file).theme.extend;
    expect(tokens.colors).toEqual(ext.colors);
    expect(tokens.spacing).toEqual(ext.spacing);
    expect(tokens.borderRadius).toEqual(ext.borderRadius);
    const ours = Object.fromEntries(
      Object.entries(tokens.fontSize).map(([k, v]) => [
        k,
        [v[0], (v[1] as { lineHeight: string }).lineHeight],
      ]),
    );
    const theirs = Object.fromEntries(
      Object.entries(ext.fontSize as Record<string, [string, { lineHeight: string }]>).map(
        ([k, v]) => [k, [v[0], v[1].lineHeight]],
      ),
    );
    expect(ours).toEqual(theirs);
  });
});
