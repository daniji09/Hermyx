import { loadEnv } from 'vite';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const clientDirectory = fileURLToPath(new URL('../../', import.meta.url));
const e2eEnv = loadEnv('e2e', clientDirectory, '');

for (const [key, value] of Object.entries(e2eEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}
