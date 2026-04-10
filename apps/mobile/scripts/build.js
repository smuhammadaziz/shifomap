#!/usr/bin/env node
const path = require('path');
const { execSync } = require('child_process');

const mobileRoot = path.join(__dirname, '..');
const localBin = path.join(mobileRoot, 'node_modules', '.bin');
const pathEnv = `${localBin}${path.delimiter}${process.env.PATH || ''}`;

function eas(args) {
  execSync(`pnpm exec eas ${args}`, {
    stdio: 'inherit',
    cwd: mobileRoot,
    shell: true,
    env: { ...process.env, PATH: pathEnv },
  });
}

const platform = process.argv[2];

if (platform === 'android') {
  eas('build --platform android --profile preview --clear-cache');
} else if (platform === 'ios') {
  eas('build --platform ios --profile production');
} else {
  console.error(
    'Usage: node scripts/build.js android|ios (preview/internal). For Play Store AAB: pnpm build:production from repo root or apps/mobile.'
  );
  process.exit(1);
}
