import { execSync } from 'child_process';
import { existsSync, createWriteStream, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import https from 'https';
import { load } from 'cheerio';

const BASE = 'https://tov2024.imweb.me';
const DETAIL_DIR = 'F:/tov2026/assets/portfolio/detail';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const ws = createWriteStream(dest);
      res.pipe(ws);
      ws.on('finish', () => { ws.close(); resolve(); });
      ws.on('error', reject);
    }).on('error', reject);
  });
}

function toWebP(input, output) {
  try {
    execSync(`npx sharp-cli -i "${input}" -o "${output}" --format webp --quality 85`, {
      stdio: 'pipe', cwd: 'F:/tov2026'
    });
    return true;
  } catch { return false; }
}

// Known idx values for r001-r004
const items = [
  { id: 'r001', idx: '169107972' },
  { id: 'r002', idx: '169107102' },
  { id: 'r003', idx: '169089077' },
  { id: 'r004', idx: '168663449' },
];

async function main() {
  for (const item of items) {
    console.log(`\n--- ${item.id} ---`);
    const detailUrl = `${BASE}/house/?bmode=view&idx=${item.idx}&t=board`;
    const html = await fetchPage(detailUrl);
    const $ = load(html);

    const images = [];
    $('img').each((i, el) => {
      const src = $(el).attr('src') || '';
      if (src.includes('cdn.imweb.me/upload/')) {
        const cleanSrc = src.split('?')[0];
        if (!images.includes(cleanSrc)) images.push(cleanSrc);
      }
    });

    console.log(`  Found ${images.length} images, downloading first 10`);

    const detailDir = join(DETAIL_DIR, item.id);
    mkdirSync(detailDir, { recursive: true });

    const toDownload = images.slice(0, 10);
    for (let i = 0; i < toDownload.length; i++) {
      const imgUrl = toDownload[i];
      const imgId = `${item.id}_${String(i + 1).padStart(2, '0')}`;
      const webpPath = join(detailDir, `${imgId}.webp`);
      if (existsSync(webpPath)) { continue; }
      const ext = imgUrl.split('.').pop() || 'jpg';
      const origPath = join(detailDir, `${imgId}.${ext}`);
      process.stdout.write(`  ${imgId}... `);
      try {
        await download(imgUrl, origPath);
        const ok = toWebP(origPath, webpPath);
        console.log(ok ? 'OK' : 'kept original');
      } catch (e) {
        console.log(`FAILED: ${e.message}`);
      }
      await sleep(200);
    }
  }
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
