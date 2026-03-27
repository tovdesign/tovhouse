/**
 * 토브디자인 포트폴리오 전체 마이그레이션 스크립트
 * - 목록 페이지에서 전체 idx 수집
 * - 상세 페이지에서 기본정보 + 이미지 URL 추출
 * - 이미지 다운로드 + WebP 변환
 * - 항목별 검증 + 프로그레스바
 */
import https from 'https';
import http from 'http';
import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BASE = 'https://tovdesign.imweb.me';
const ASSETS_DIR = path.join(process.cwd(), 'assets', 'portfolio');
const EXCLUDE_HASHES = ['02dee919b7459', '1693dd50a09ca', '64d3f654e515c', 'default_profile', 'f008a68c6f4d3', '0c4bfd4525269'];

// ─── Utilities ───────────────────────────────────────
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const handler = (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redir = res.headers.location.startsWith('http')
          ? res.headers.location : new URL(res.headers.location, url).href;
        fetchPage(redir).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    };
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, handler)
      .on('error', reject);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const handler = (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redir = res.headers.location.startsWith('http')
          ? res.headers.location : new URL(res.headers.location, url).href;
        downloadFile(redir, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', reject);
    };
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, handler).on('error', reject);
  });
}

function toWebP(input, output) {
  try {
    execSync(`node -e "require('sharp')('${input.replace(/\\/g, '\\\\')}').webp({quality:85}).toFile('${output.replace(/\\/g, '\\\\')}').then(()=>process.exit(0)).catch(()=>process.exit(1))"`, { stdio: 'pipe', timeout: 30000 });
    return true;
  } catch { return false; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Progress Bar ────────────────────────────────────
function progressBar(current, total, item, status) {
  const pct = Math.round((current / total) * 100);
  const barLen = 30;
  const filled = Math.round(barLen * current / total);
  const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
  const line = `\r[${bar}] ${pct}% (${current}/${total}) ${item} ${status}`;
  process.stdout.write(line.padEnd(120));
}

// ─── Phase 1: Collect all post idx from list pages ───
async function collectAllIdx() {
  console.log('\n━━━ Phase 1: 게시물 목록 수집 ━━━\n');
  const allItems = [];

  // Residential pages 1-6
  for (let page = 1; page <= 6; page++) {
    const url = `${BASE}/house/?q=YToxOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjt9&page=${page}`;
    process.stdout.write(`  주거공간 ${page}페이지 수집 중...`);
    const html = await fetchPage(url);
    const $ = load(html);

    // Find post links with idx parameter
    $('a[href*="bmode=view"]').each((i, el) => {
      const href = $(el).attr('href') || '';
      const idxMatch = href.match(/idx=(\d+)/);
      if (idxMatch) {
        const idx = idxMatch[1];
        // Avoid duplicates
        if (!allItems.find(item => item.idx === idx)) {
          const num = allItems.filter(i => i.category === 'residential').length + 1;
          allItems.push({
            id: `r${String(num).padStart(3, '0')}`,
            idx,
            category: 'residential',
            board: 'house',
          });
        }
      }
    });
    console.log(` ${allItems.filter(i => i.category === 'residential').length}개`);
    await sleep(300);
  }

  // Commercial pages 1-2
  for (let page = 1; page <= 2; page++) {
    const url = `${BASE}/commerce/?q=YToxOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjt9&page=${page}`;
    process.stdout.write(`  상업공간 ${page}페이지 수집 중...`);
    const html = await fetchPage(url);
    const $ = load(html);

    $('a[href*="bmode=view"]').each((i, el) => {
      const href = $(el).attr('href') || '';
      const idxMatch = href.match(/idx=(\d+)/);
      if (idxMatch) {
        const idx = idxMatch[1];
        if (!allItems.find(item => item.idx === idx)) {
          const num = allItems.filter(i => i.category === 'commercial').length + 1;
          allItems.push({
            id: `c${String(num).padStart(3, '0')}`,
            idx,
            category: 'commercial',
            board: 'commerce',
          });
        }
      }
    });
    console.log(` ${allItems.filter(i => i.category === 'commercial').length}개`);
    await sleep(300);
  }

  console.log(`\n  총 ${allItems.length}개 게시물 수집 완료\n`);
  return allItems;
}

// ─── Phase 2: Scrape detail + download images ────────
async function scrapeAndDownload(item, current, total) {
  const url = `${BASE}/${item.board}/?q=YToxOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjt9&bmode=view&idx=${item.idx}&t=board`;

  progressBar(current, total, item.id, '페이지 로드...');

  const html = await fetchPage(url);
  const $ = load(html);

  // ── Extract title from page title
  const pageTitle = $('title').text().trim();
  const bracketMatch = pageTitle.match(/\[(.+?)\]/);
  const displayTitle = bracketMatch ? bracketMatch[1] : '';

  // ── Extract basic info
  const bodyText = $('body').text().replace(/\s+/g, ' ');
  const region = bodyText.match(/지역\s*[l|:]\s*(.+?)(?=공간|면적|업종)/)?.[1]?.trim() || '';
  const type = bodyText.match(/(?:공간|업종)\s*[l|:]\s*(.+?)(?=면적|기간)/)?.[1]?.trim() || '';
  const area = bodyText.match(/면적\s*[l|:]\s*(.+?)(?=기간)/)?.[1]?.trim() || '';
  const duration = bodyText.match(/기간\s*[l|:]\s*(.+?)(?=총액|예산|비용|\d\.)/)?.[1]?.trim() || '';
  const costRaw = bodyText.match(/(?:총액|예산|비용)\s*[l|:]\s*(.+?)(?=\d\.|시공|공간|인테리어|\s{3})/)?.[1]?.trim() || '';
  // Clean cost: remove any trailing text that's not part of the amount
  const cost = costRaw.replace(/[가-힣\s]+$/, '').trim();

  // ── Extract image URLs
  // Method 1: data-src (lazy loaded content images)
  const imageUrls = [];
  $('img[data-src]').each((i, el) => {
    const ds = $(el).attr('data-src') || '';
    if (ds.includes('cdn.imweb.me')) {
      const hash = ds.match(/([a-f0-9]{10,}\.\w+)/)?.[1] || '';
      if (hash && !EXCLUDE_HASHES.some(h => hash.startsWith(h))) {
        imageUrls.push(ds);
      }
    }
  });

  // Method 2: src with upload path
  $('img').each((i, el) => {
    const src = $(el).attr('src') || '';
    if (src.includes('cdn.imweb.me/upload/')) {
      const hash = src.match(/([a-f0-9]{10,}\.\w+)/)?.[1] || '';
      if (hash && !EXCLUDE_HASHES.some(h => hash.startsWith(h))) {
        imageUrls.push(src);
      }
    }
  });

  const uniqueUrls = [...new Set(imageUrls)];

  progressBar(current, total, item.id, `이미지 ${uniqueUrls.length}개 다운로드...`);

  // ── Download images
  const thumbDir = path.join(ASSETS_DIR, 'thumbnails');
  const detailDir = path.join(ASSETS_DIR, 'detail', item.id);
  fs.mkdirSync(thumbDir, { recursive: true });
  fs.mkdirSync(detailDir, { recursive: true });

  const detailImages = [];
  let downloadFailed = 0;
  const MAX_RETRIES = 3;

  for (let i = 0; i < uniqueUrls.length; i++) {
    const imgUrl = uniqueUrls[i];
    const num = String(i + 1).padStart(2, '0');
    const ext = path.extname(new URL(imgUrl).pathname) || '.jpg';
    const origPath = path.join(detailDir, `${item.id}_${num}${ext}`);
    const webpPath = path.join(detailDir, `${item.id}_${num}.webp`);

    let success = false;
    for (let retry = 0; retry < MAX_RETRIES && !success; retry++) {
      try {
        await downloadFile(imgUrl, origPath);
        // Verify file size > 0
        const stat = fs.statSync(origPath);
        if (stat.size < 100) {
          throw new Error(`File too small: ${stat.size} bytes`);
        }
        const ok = toWebP(origPath, webpPath);
        if (ok && fs.existsSync(webpPath)) {
          const webpStat = fs.statSync(webpPath);
          if (webpStat.size < 100) throw new Error(`WebP too small: ${webpStat.size} bytes`);
          detailImages.push(`assets/portfolio/detail/${item.id}/${item.id}_${num}.webp`);
          try { fs.unlinkSync(origPath); } catch {}
        } else {
          detailImages.push(`assets/portfolio/detail/${item.id}/${item.id}_${num}${ext}`);
        }
        success = true;
      } catch (e) {
        if (retry < MAX_RETRIES - 1) await sleep(500);
      }
    }
    if (!success) downloadFailed++;

    // Thumbnail = first image
    if (i === 0) {
      const thumbWebp = path.join(thumbDir, `${item.id}.webp`);
      try {
        if (fs.existsSync(webpPath)) {
          fs.copyFileSync(webpPath, thumbWebp);
        } else if (fs.existsSync(origPath)) {
          toWebP(origPath, thumbWebp);
        }
      } catch {}
    }

    await sleep(50);
  }

  // ── Verify: thumbnail exists, file count matches, no 0-byte files
  const thumbPath = path.join(thumbDir, `${item.id}.webp`);
  const thumbExists = fs.existsSync(thumbPath) && fs.statSync(thumbPath).size > 100;
  const diskFiles = fs.readdirSync(detailDir).filter(f => f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.png'));
  const zeroByteFiles = diskFiles.filter(f => {
    try { return fs.statSync(path.join(detailDir, f)).size < 100; } catch { return true; }
  });
  const verified = thumbExists && diskFiles.length === uniqueUrls.length && downloadFailed === 0 && zeroByteFiles.length === 0;

  // Write per-item verification log
  const logLine = `${item.id} | ${verified ? 'OK' : 'FAIL'} | src:${uniqueUrls.length} disk:${diskFiles.length} fail:${downloadFailed} 0byte:${zeroByteFiles.length} | ${displayTitle.substring(0, 40)}\n`;
  fs.appendFileSync('migration-log.txt', logLine);

  const status = verified
    ? `✅ ${uniqueUrls.length}장 | ${displayTitle.substring(0, 30)}`
    : `⚠️ ${diskFiles.length}/${uniqueUrls.length}장 (실패:${downloadFailed}) | ${displayTitle.substring(0, 25)}`;

  progressBar(current, total, item.id, status);
  console.log(); // newline

  return {
    id: item.id,
    idx: item.idx,
    category: item.category,
    title: displayTitle,
    region, type, area, duration, cost,
    thumbnail: `assets/portfolio/thumbnails/${item.id}.webp`,
    detailImages,
    sourceImageCount: uniqueUrls.length,
    diskImageCount: diskFiles.length,
    verified,
  };
}

// ─── Main ────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  토브디자인 포트폴리오 마이그레이션      ║');
  console.log('║  tovdesign.imweb.me → 2026tovhouse       ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Phase 1: Collect idx
  const allItems = await collectAllIdx();

  // Save idx list
  fs.writeFileSync('all-items-idx.json', JSON.stringify(allItems, null, 2));

  // Phase 2: Scrape + Download
  console.log('━━━ Phase 2: 상세 데이터 수집 + 이미지 다운로드 ━━━\n');
  const total = allItems.length;
  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < allItems.length; i++) {
    try {
      const result = await scrapeAndDownload(allItems[i], i + 1, total);
      results.push(result);
      if (result.verified) successCount++;
      else failCount++;
    } catch (e) {
      console.log(`\n  ❌ ${allItems[i].id}: ${e.message}`);
      results.push({ id: allItems[i].id, error: e.message, verified: false });
      failCount++;
    }
    await sleep(300); // Rate limit between pages
  }

  // Phase 3: Build portfolio-data.json
  console.log('\n━━━ Phase 3: portfolio-data.json 생성 ━━━\n');

  const residential = results.filter(r => r.category === 'residential' && !r.error);
  const commercial = results.filter(r => r.category === 'commercial' && !r.error);

  const portfolioData = { residential, commercial };
  fs.writeFileSync('portfolio-data.json', JSON.stringify(portfolioData, null, 2));

  // Final report
  console.log('╔══════════════════════════════════════════╗');
  console.log('║           마이그레이션 완료              ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  주거공간: ${String(residential.length).padStart(3)}개                        ║`);
  console.log(`║  상업공간: ${String(commercial.length).padStart(3)}개                        ║`);
  console.log(`║  ─────────────────────────────────       ║`);
  console.log(`║  성공: ${String(successCount).padStart(3)}개  실패: ${String(failCount).padStart(3)}개               ║`);
  console.log('╚══════════════════════════════════════════╝');

  // List failures
  const failures = results.filter(r => !r.verified);
  if (failures.length > 0) {
    console.log('\n⚠️ 검증 실패 항목:');
    failures.forEach(f => {
      console.log(`  ${f.id}: ${f.error || `${f.diskImageCount}/${f.sourceImageCount}장`}`);
    });
  }

  // Disk usage
  try {
    const du = execSync('du -sh "' + ASSETS_DIR + '"', { encoding: 'utf-8' }).trim();
    console.log(`\n💾 총 용량: ${du.split('\t')[0]}`);
  } catch {}
}

main().catch(console.error);
