import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(SCRIPT_DIR, '..');
const SOURCE_ENTRY = join(WEB_ROOT, 'src', 'main.tsx');
const DIST_ROOT = join(WEB_ROOT, 'dist');

export const FORBIDDEN_PATTERNS = [
  ['Tauri package', /@tauri-apps/i],
  ['Tauri bridge', /\bsafeInvoke\b/i],
  ['desktop access bootstrap', /\bopenInitialAccess\b/i],
  ['browser command bridge', /\/browser\/command/i],
  ['desktop runtime port', /\b(?:9876|9878)\b/],
  ['desktop launcher string', /\b(?:desktop|launcher)\b/i],
  ['loopback runtime URL', /https?:\/\/(?:localhost|127\.0\.0\.1):(?:9876|9878)\b/i],
];

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const IMPORT_PATTERN = /\b(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_PATTERN = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;

function relativeName(filePath) {
  return relative(WEB_ROOT, filePath).replaceAll('\\', '/');
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [base, ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`), ...SOURCE_EXTENSIONS.map((extension) => join(base, `index${extension}`))];
  return candidates.find((candidate) => {
    try {
      return statSync(candidate).isFile();
    } catch {
      return false;
    }
  }) ?? null;
}

export function reachableSourceFiles(entry = SOURCE_ENTRY) {
  const files = [];
  const pending = [entry];
  const seen = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    files.push(file);
    const source = readFileSync(file, 'utf8');
    for (const pattern of [IMPORT_PATTERN, DYNAMIC_IMPORT_PATTERN]) {
      for (const match of source.matchAll(pattern)) {
        const imported = resolveImport(file, match[1]);
        if (imported) pending.push(imported);
      }
    }
  }
  return files.sort();
}

export function findForbidden(text, fileName) {
  return FORBIDDEN_PATTERNS.flatMap(([label, pattern]) => pattern.test(text) ? [`${fileName}: ${label}`] : []);
}

function buildFiles(root = DIST_ROOT) {
  if (!statSync(root, { throwIfNoEntry: false })) return [];
  const files = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const file = join(current, entry.name);
      if (entry.isDirectory()) pending.push(file);
      else files.push(file);
    }
  }
  return files.sort();
}

export function assertWebOnly({ entry = SOURCE_ENTRY, dist = DIST_ROOT } = {}) {
  const sourceFiles = reachableSourceFiles(entry);
  const sourceViolations = sourceFiles.flatMap((file) => findForbidden(readFileSync(file, 'utf8'), relativeName(file)));
  const distFiles = buildFiles(dist);
  const buildViolations = distFiles.flatMap((file) => findForbidden(readFileSync(file, 'utf8'), relativeName(file)));
  const violations = [...sourceViolations, ...buildViolations];
  if (violations.length) throw new Error(`Web-only assertion failed:\n${violations.join('\n')}`);
  return { sourceFiles: sourceFiles.length, buildFiles: distFiles.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = assertWebOnly();
  console.log(`web-only assertion passed (${result.sourceFiles} active source files, ${result.buildFiles} build files)`);
}
