#!/usr/bin/env node
const { execSync } = require('child_process');
const platform = process.argv[2];

if (platform === 'android') {
  execSync('npx eas build --platform android --profile preview --clear-cache', {
    stdio: 'inherit',
  });
} else if (platform === 'ios') {
  execSync('npx eas build --platform ios --profile production', {
    stdio: 'inherit',
  });
} else {
  console.error('Usage: pnpm build android | pnpm build ios');
  process.exit(1);
}
