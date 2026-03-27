import { execSync } from 'child_process';
import { existsSync, createWriteStream } from 'fs';
import { join, basename } from 'path';
import https from 'https';
import http from 'http';

const THUMB_DIR = 'F:/tov2026/assets/portfolio/thumbnails';
const SITE_DIR = 'F:/tov2026/assets/site';

const page1Items = [
  { id: "r001", src: "https://cdn.imweb.me/thumbnail/20251219/32bd0a2fc6b8b.jpg", title: "서울 성북구 석관동 49평" },
  { id: "r002", src: "https://cdn.imweb.me/thumbnail/20251219/f749b57b320a9.jpg", title: "서울 동대문구 전농동 33평" },
  { id: "r003", src: "https://cdn.imweb.me/thumbnail/20251218/06a6d43284973.jpg", title: "경기도 고양시 도내동 34평" },
  { id: "r004", src: "https://cdn.imweb.me/thumbnail/20251119/4dac1ef01c93d.jpg", title: "경기도 고양시 원흥동 34평" },
];

const siteImages = [
  { src: "https://cdn.imweb.me/thumbnail/20240730/9d005b1801024.png", name: "category-residential" },
  { src: "https://cdn.imweb.me/thumbnail/20240730/1a991e9d17670.png", name: "category-commercial" },
  { src: "https://cdn.imweb.me/thumbnail/20240730/3dc880548690e.png", name: "category-construction" },
  { src: "https://cdn.imweb.me/thumbnail/20240730/fd321ecb7dddc.png", name: "category-furniture" },
  { src: "https://cdn.imweb.me/thumbnail/20250428/823aebf296621.png", name: "logo-full" },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      const ws = createWriteStream(dest);
      res.pipe(ws);
      ws.on('finish', () => { ws.close(); resolve(); });
      ws.on('error', reject);
    }).on('error', reject);
  });
}

function toWebP(input, output) {
  try {
    execSync(`npx sharp-cli -i "${input}" -o "${output}" --format webp --quality 85`, { stdio: 'pipe' });
    return true;
  } catch { return false; }
}

async function run() {
  console.log('=== Portfolio Image Download + WebP ===\n');

  for (const item of page1Items) {
    const ext = item.src.split('.').pop();
    const orig = join(THUMB_DIR, `${item.id}.${ext}`);
    const webp = join(THUMB_DIR, `${item.id}.webp`);
    if (existsSync(webp)) { console.log(`⏭ ${item.id}`); continue; }
    try {
      process.stdout.write(`↓ ${item.id} ${item.title}...`);
      await download(item.src, orig);
      const ok = toWebP(orig, webp);
      console.log(ok ? ' ✓' : ' (kept original)');
    } catch (e) { console.log(` ✗ ${e.message}`); }
  }

  console.log('\n--- Site images ---');
  for (const img of siteImages) {
    const ext = img.src.split('.').pop();
    const orig = join(SITE_DIR, `${img.name}.${ext}`);
    const webp = join(SITE_DIR, `${img.name}.webp`);
    if (existsSync(webp)) { console.log(`⏭ ${img.name}`); continue; }
    try {
      process.stdout.write(`↓ ${img.name}...`);
      await download(img.src, orig);
      const ok = toWebP(orig, webp);
      console.log(ok ? ' ✓' : ' (kept original)');
    } catch (e) { console.log(` ✗ ${e.message}`); }
  }

  console.log('\n✅ Done');
}

run();
