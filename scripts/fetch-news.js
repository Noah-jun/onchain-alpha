#!/usr/bin/env node
// Fetch Odaily newsflash and output as JSON
// Called as: node fetch-news.js

const { execSync } = require('child_process');

try {
  const result = execSync(
    'curl -s --max-time 6 --connect-timeout 4 --proxy http://127.0.0.1:7897 ' +
    '-H "Accept: text/html" ' +
    '"https://www.odaily.news/newsflash"',
    { timeout: 10000, encoding: 'utf-8', shell: '/bin/zsh' }
  );
  process.stdout.write(JSON.stringify({ success: true, html: result }));
} catch (e) {
  process.stdout.write(JSON.stringify({ success: false, error: e.message }));
}
