/**
 * Parse every CSS file in the project with PostCSS and fail on a syntax error.
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-09-19 a stray `}` in app/page.module.css broke the Vercel build for
 * roughly nine hours. Two separate pieces of finished work — the reviews
 * marquee redesign and a whole SEO pass — sat on GitHub and never reached the
 * live site, because every deploy after that commit failed at
 *
 *     ./app/page.module.css:686:1
 *     Syntax error: Unexpected }
 *
 * It went unnoticed because the pre-push check was `tsc --noEmit`, and
 * **TypeScript does not look at CSS at all**. A green type-check felt like a
 * green build and was not one. `next build` is the only thing that compiles
 * CSS, and it cannot run in the environment where the edits were made.
 *
 * This script closes that gap: it runs the exact parser whose failure broke the
 * build (PostCSS — the Vercel error was a `PostCSSSyntaxError`), it needs no
 * bundler, and it finishes in well under a second.
 *
 * Run it before every push:   npm run check:css
 *
 * A passing type-check plus a passing CSS parse is not proof that `next build`
 * succeeds, but it covers the two failure modes that have actually bitten this
 * repo. Vercel's build remains the final word.
 */

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'out', 'build']);
const ROOTS = ['app', 'src', 'styles', 'components'];

function collect(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) collect(full, found);
    } else if (entry.name.endsWith('.css')) {
      found.push(full);
    }
  }
  return found;
}

const files = ROOTS.flatMap((r) => collect(r));
const failures = [];

for (const file of files) {
  try {
    postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
  } catch (err) {
    failures.push({ file, message: err.reason || err.message, line: err.line, column: err.column });
  }
}

if (failures.length > 0) {
  console.error('\nCSS SYNTAX ERRORS — this WILL fail the Vercel build:\n');
  for (const f of failures) {
    const where = f.line ? `${f.file}:${f.line}:${f.column ?? 1}` : f.file;
    console.error(`  ${where}`);
    console.error(`    ${f.message}\n`);
  }
  console.error(`${failures.length} of ${files.length} CSS files failed to parse.\n`);
  process.exit(1);
}

console.log(`CSS OK — ${files.length} files parsed, 0 syntax errors.`);
