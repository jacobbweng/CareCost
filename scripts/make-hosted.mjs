// Turns dist-single/index.html into a body fragment for hosts that wrap pages
// in their own <html>/<head>/<body> skeleton. Usage: node scripts/make-hosted.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync('dist-single/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/i)[1];
const title = head.match(/<title>[\s\S]*?<\/title>/i)[0].replace(/CareCost — Find care that works for you/, 'CareCost');
const keep = [...head.matchAll(/<link[^>]+fonts\.(?:googleapis|gstatic)[^>]*>|<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<meta name="description"[^>]*>/gi)].map((m) => m[0]);
writeFileSync('dist-single/carecost.html', [title, ...keep, body].join('\n'));
console.log('wrote dist-single/carecost.html', (body.length / 1024).toFixed(0) + 'KB body');
