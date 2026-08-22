import { once } from 'node:events';
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { installPreviewProtectionRoutes } from '../helpers/app';

const bypassHeader = 'x-vercel-protection-bypass';
const webBypass = 'test-web-bypass';
const apiBypass = 'test-api-bypass';
const changedEnvironmentNames = [
  'AUREA_E2E_URL',
  'AUREA_E2E_API_URL',
  'AUREA_VERCEL_WEB_PROTECTION_BYPASS',
  'AUREA_VERCEL_API_PROTECTION_BYPASS',
] as const;
const originalEnvironment = new Map(
  changedEnvironmentNames.map((name) => [name, process.env[name]]),
);

type RecordedOrigin = {
  headers: IncomingHttpHeaders[];
  server: Server;
  url: string;
};

async function startOrigin(): Promise<RecordedOrigin> {
  const headers: IncomingHttpHeaders[] = [];
  const server = createServer((request, response) => {
    headers.push(request.headers);
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{"status":"ok"}');
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end('<!doctype html><title>boundary</title>');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test origin did not bind.');
  return { headers, server, url: `http://127.0.0.1:${address.port}` };
}

let webOrigin: RecordedOrigin;
let apiOrigin: RecordedOrigin;
let otherOrigin: RecordedOrigin;

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test.beforeAll(async () => {
  [webOrigin, apiOrigin, otherOrigin] = await Promise.all([
    startOrigin(),
    startOrigin(),
    startOrigin(),
  ]);
  process.env.AUREA_E2E_URL = webOrigin.url;
  process.env.AUREA_E2E_API_URL = apiOrigin.url;
  process.env.AUREA_VERCEL_WEB_PROTECTION_BYPASS = webBypass;
  process.env.AUREA_VERCEL_API_PROTECTION_BYPASS = apiBypass;
});

test.afterAll(async () => {
  try {
    await Promise.all([webOrigin, apiOrigin, otherOrigin].map(
      ({ server }) => new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      }),
    ));
  } finally {
    for (const name of changedEnvironmentNames) {
      const originalValue = originalEnvironment.get(name);
      if (originalValue === undefined) delete process.env[name];
      else process.env[name] = originalValue;
    }
  }
});

test('keeps preview bypass headers on their exact origins', async ({ page }) => {
  await installPreviewProtectionRoutes(page);
  await page.goto(webOrigin.url);
  await page.goto(`${apiOrigin.url}/page`);
  await page.setExtraHTTPHeaders({ [bypassHeader]: webBypass });
  await page.goto(otherOrigin.url);

  expect(webOrigin.headers.at(-1)?.[bypassHeader]).toBe(webBypass);
  expect(apiOrigin.headers.at(-1)?.[bypassHeader]).toBe(apiBypass);
  expect(otherOrigin.headers.at(-1)?.[bypassHeader]).toBeUndefined();
  expect(JSON.stringify(otherOrigin.headers.at(-1))).not.toContain(webBypass);
  expect(JSON.stringify(otherOrigin.headers.at(-1))).not.toContain(apiBypass);
});
