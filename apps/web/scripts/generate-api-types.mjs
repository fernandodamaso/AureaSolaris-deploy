import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDirectory, '..');
const repositoryRoot = resolve(webRoot, '..', '..');
const input = join(repositoryRoot, 'services', 'api', 'openapi.json');
const output = join(webRoot, 'src', 'api', 'generated.ts');
const cli = join(repositoryRoot, 'node_modules', 'openapi-typescript', 'bin', 'cli.js');
const check = process.argv.includes('--check');

function generate(destination) {
  execFileSync(process.execPath, [cli, input, '-o', destination], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
}

if (check) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'aurea-api-types-'));
  const temporaryOutput = join(temporaryDirectory, 'generated.ts');
  try {
    generate(temporaryOutput);
    const expected = readFileSync(temporaryOutput, 'utf8').replace(/\r\n/g, '\n');
    const current = readFileSync(output, 'utf8').replace(/\r\n/g, '\n');
    if (expected !== current) {
      console.error('Generated API types are out of date. Run api:generate.');
      process.exitCode = 1;
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
} else {
  generate(output);
}
