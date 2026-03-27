/**
 * Download images for new portfolio items and convert to WebP
 * Uses data from scraped-new-items.json
 */
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DATA_FILE = path.join(process.cwd(), 'scraped-new-items.json');
const ASSETS_DIR = path.join(process.cwd(), 'assets', 'portfolio');

const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const handler = (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', reject);
    };
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, handler).on('error', reject);
  });
}

function convertToWebP(inputPath, outputPath) {
  try {
    execSync(`npx sharp-cli -i "${inputPath}" -o "${outputPath}" --format webp --quality 85`, {
      stdio: 'pipe',
      timeout: 30000
    });
    return true;
  } catch (e) {
    // Fallback: use sharp programmatically
    try {
      execSync(`node -e "const sharp=require('sharp');sharp('${inputPath.replace(/\\/g, '\\\\')}').webp({quality:85}).toFile('${outputPath.replace(/\\/g, '\\\\')}').then(()=>process.exit(0))"`, {
        stdio: 'pipe',
        timeout: 30000
      });
      return true;
    } catch (e2) {
      console.error(`    WebP conversion failed: ${e2.message}`);
      return false;
    }
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function processItem(item) {
  const { id, detailImageUrls } = item;
  if (!detailImageUrls || detailImageUrls.length === 0) {
    console.log(`  ⚠️ ${id}: No images to download`);
    return;
  }

  // Create directories
  const thumbDir = path.join(ASSETS_DIR, 'thumbnails');
  const detailDir = path.join(ASSETS_DIR, 'detail', id);
  fs.mkdirSync(thumbDir, { recursive: true });
  fs.mkdirSync(detailDir, { recursive: true });

  // Download thumbnail (first image)
  const thumbUrl = detailImageUrls[0];
  const thumbExt = path.extname(new URL(thumbUrl).pathname) || '.jpg';
  const thumbOrigPath = path.join(thumbDir, `${id}${thumbExt}`);
  const thumbWebpPath = path.join(thumbDir, `${id}.webp`);

  if (!fs.existsSync(thumbWebpPath)) {
    try {
      await downloadFile(thumbUrl, thumbOrigPath);
      convertToWebP(thumbOrigPath, thumbWebpPath);
      console.log(`  📷 ${id} thumbnail OK`);
    } catch (e) {
      console.error(`  ❌ ${id} thumbnail failed: ${e.message}`);
    }
  } else {
    console.log(`  ⏭️ ${id} thumbnail exists`);
  }

  // Download detail images
  for (let i = 0; i < detailImageUrls.length; i++) {
    const url = detailImageUrls[i];
    const num = String(i + 1).padStart(2, '0');
    const ext = path.extname(new URL(url).pathname) || '.jpg';
    const origPath = path.join(detailDir, `${id}_${num}${ext}`);
    const webpPath = path.join(detailDir, `${id}_${num}.webp`);

    if (fs.existsSync(webpPath)) continue;

    try {
      await downloadFile(url, origPath);
      convertToWebP(origPath, webpPath);
      await sleep(100); // Rate limit
    } catch (e) {
      console.error(`    ❌ ${id}_${num}: ${e.message}`);
    }
  }

  console.log(`  ✅ ${id}: ${detailImageUrls.length} images processed`);
}

async function main() {
  console.log(`Processing ${items.length} items...`);
  console.log(`Assets dir: ${ASSETS_DIR}\n`);

  let processed = 0;
  for (const item of items) {
    console.log(`[${++processed}/${items.length}] ${item.id}`);
    await processItem(item);
    await sleep(200);
  }

  // Count results
  const thumbCount = fs.readdirSync(path.join(ASSETS_DIR, 'thumbnails')).filter(f => f.endsWith('.webp')).length;
  const detailDirs = fs.readdirSync(path.join(ASSETS_DIR, 'detail'));
  console.log(`\n=== Summary ===`);
  console.log(`Thumbnails: ${thumbCount} WebP files`);
  console.log(`Detail dirs: ${detailDirs.length}`);
}

main().catch(console.error);
