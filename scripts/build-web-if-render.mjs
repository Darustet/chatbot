import { existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const isRender = Boolean(process.env.RENDER || process.env.CI);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const indexFile = path.join(distDir, 'index.html');

if (!isRender) {
  console.log('postinstall: not running on Render/CI; skipping web build');
  process.exit(0);
}

if (existsSync(indexFile)) {
  console.log('postinstall: dist already exists; skipping web build');
  process.exit(0);
}

console.log('postinstall: building Expo web export for Render/CI');
execSync('npm run build:web', {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=384',
  },
});

if (!existsSync(indexFile)) {
  console.error('postinstall: build finished but dist/index.html is still missing');
  process.exit(1);
}

console.log('postinstall: dist contents:');
for (const entry of readdirSync(distDir).slice(0, 50)) {
  console.log(`- ${entry}`);
}
