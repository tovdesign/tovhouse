import { execSync } from 'child_process';
import { existsSync, createWriteStream, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import https from 'https';
import http from 'http';
import { load } from 'cheerio';

// ── Config ──────────────────────────────────────────────────────────
const BASE = 'https://tov2024.imweb.me';
const THUMB_DIR = 'F:/tov2026/assets/portfolio/thumbnails';
const DETAIL_DIR = 'F:/tov2026/assets/portfolio/detail';
const DATA_FILE = 'F:/tov2026/portfolio-data.json';
const SKIP_IDS = new Set(['r001', 'r002', 'r003', 'r004']);
const DELAY_MS = 800;

// ── Helpers ─────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
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
    execSync(`npx sharp-cli -i "${input}" -o "${output}" --format webp --quality 85`, {
      stdio: 'pipe', cwd: 'F:/tov2026'
    });
    return true;
  } catch (e) {
    console.error(`  WebP conversion failed: ${e.message}`);
    return false;
  }
}

// ── Scrape listing page ─────────────────────────────────────────────
function parseListPage(html) {
  const $ = load(html);
  const items = [];

  // Find all post items via the board widget
  $('._post_item_wrap').each((i, el) => {
    const $el = $(el);

    // Thumbnail: background-image on ._card div
    const cardStyle = $el.find('._card').attr('style') || '';
    const bgMatch = cardStyle.match(/url\(['"]?(https:\/\/cdn\.imweb\.me\/[^'"?)]+)/);
    const thumb = bgMatch ? bgMatch[1] : '';

    // Title: text inside .title div
    const titleText = $el.find('.title').text().trim().replace(/\s+/g, ' ');
    const bracketMatch = titleText.match(/\[(.+)\]/);
    const title = bracketMatch ? bracketMatch[1] : titleText;

    // Detail page idx from link
    const href = $el.find('a._fade_link').attr('href') || '';
    const idxMatch = href.match(/idx=(\d+)/);
    const idx = idxMatch ? idxMatch[1] : '';

    if (title && idx) {
      items.push({ thumb, title, idx });
    }
  });

  return items;
}

// ── Scrape detail page ──────────────────────────────────────────────
function parseDetailPage(html) {
  const $ = load(html);
  const info = {};
  const images = [];

  // Extract basic info from text
  const bodyText = $('body').text();

  // Parse structured info
  const regionMatch = bodyText.match(/지역\s*[l|ㅣ|\|]\s*(.+?)(?:\n|공간)/);
  if (regionMatch) info.region = regionMatch[1].trim();

  const typeMatch = bodyText.match(/공간\s*[l|ㅣ|\|]\s*(.+?)(?:\n|면적)/);
  if (typeMatch) info.type = typeMatch[1].trim();

  const areaMatch = bodyText.match(/면적\s*[l|ㅣ|\|]\s*(.+?)(?:\n|기간)/);
  if (areaMatch) info.area = areaMatch[1].trim();

  const durationMatch = bodyText.match(/기간\s*[l|ㅣ|\|]\s*(.+?)(?:\n|총액)/);
  if (durationMatch) info.duration = durationMatch[1].trim();

  const costMatch = bodyText.match(/총액\s*[l|ㅣ|\|]\s*([\d억\s,만원]+)/);
  if (costMatch) info.cost = costMatch[1].trim();

  // Extract all interior/detail images (cdn.imweb.me/upload/ images)
  $('img').each((i, el) => {
    const src = $(el).attr('src') || '';
    if (src.includes('cdn.imweb.me/upload/')) {
      const cleanSrc = src.split('?')[0];
      if (!images.includes(cleanSrc)) {
        images.push(cleanSrc);
      }
    }
  });

  // Also check for background images
  $('[style*="cdn.imweb.me/upload/"]').each((i, el) => {
    const style = $(el).attr('style') || '';
    const match = style.match(/url\(['"]?(https:\/\/cdn\.imweb\.me\/upload\/[^'"?)]+)/);
    if (match && !images.includes(match[1])) {
      images.push(match[1]);
    }
  });

  return { info, images };
}

// ── Parse title into components ─────────────────────────────────────
function parseTitle(title) {
  // Format: "서울 성북구 석관동|아파트|49평" or "서울 강서구 마곡동 | 상가_볼펜샵 | 23평"
  const parts = title.split(/\s*\|\s*/);
  return {
    region: parts[0] || '',
    type: parts[1] || '',
    area: parts[2] || ''
  };
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('=== TOV2024 Portfolio Full Download ===\n');

  // Ensure directories exist
  mkdirSync(THUMB_DIR, { recursive: true });
  mkdirSync(DETAIL_DIR, { recursive: true });

  // ── Step 1: Scrape all listing pages ──────────────────────────────
  console.log('--- Step 1: Scraping listing pages ---\n');

  const residentialItems = [];
  const commercialItems = [];

  // Residential pages 1-5
  for (let page = 1; page <= 5; page++) {
    const url = page === 1
      ? `${BASE}/house`
      : `${BASE}/house/?q=YToxOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjt9&page=${page}`;

    process.stdout.write(`  Fetching house page ${page}... `);
    try {
      const html = await fetchPage(url);
      const items = parseListPage(html);
      console.log(`${items.length} items`);
      residentialItems.push(...items);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  // Commerce page
  process.stdout.write('  Fetching commerce page... ');
  try {
    const html = await fetchPage(`${BASE}/commerce`);
    const items = parseListPage(html);
    console.log(`${items.length} items`);
    commercialItems.push(...items);
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
  }

  console.log(`\n  Total: ${residentialItems.length} residential, ${commercialItems.length} commercial\n`);

  // ── Step 2: Assign IDs ────────────────────────────────────────────
  const allItems = [];

  residentialItems.forEach((item, i) => {
    const id = `r${String(i + 1).padStart(3, '0')}`;
    const parsed = parseTitle(item.title);
    allItems.push({
      id,
      category: 'residential',
      title: item.title,
      region: parsed.region,
      type: parsed.type,
      area: parsed.area,
      thumb: item.thumb,
      idx: item.idx,
      duration: '',
      cost: '',
      detailImages: []
    });
  });

  commercialItems.forEach((item, i) => {
    const id = `c${String(i + 1).padStart(3, '0')}`;
    const parsed = parseTitle(item.title);
    allItems.push({
      id,
      category: 'commercial',
      title: item.title,
      region: parsed.region,
      type: parsed.type,
      area: parsed.area,
      thumb: item.thumb,
      idx: item.idx,
      duration: '',
      cost: '',
      detailImages: []
    });
  });

  // ── Step 3: Scrape detail pages for images and extra info ─────────
  console.log('--- Step 2: Scraping detail pages for images ---\n');

  for (const item of allItems) {
    if (!item.idx) {
      console.log(`  ${item.id}: No idx, skipping detail page`);
      continue;
    }

    const section = item.category === 'residential' ? 'house' : 'commerce';
    const detailUrl = `${BASE}/${section}/?bmode=view&idx=${item.idx}&t=board`;

    process.stdout.write(`  ${item.id} (${item.title.substring(0, 30)}...) `);
    try {
      const html = await fetchPage(detailUrl);
      const { info, images } = parseDetailPage(html);

      // Update with detail info if not parsed from title
      if (info.region && !item.region) item.region = info.region;
      if (info.type && !item.type) item.type = info.type;
      if (info.area && !item.area) item.area = info.area;
      if (info.duration) item.duration = info.duration;
      if (info.cost) item.cost = info.cost;

      item.detailImages = images;
      console.log(`${images.length} images`);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  // ── Step 4: Download thumbnails ───────────────────────────────────
  console.log('\n--- Step 3: Downloading thumbnails ---\n');

  for (const item of allItems) {
    if (SKIP_IDS.has(item.id)) {
      console.log(`  SKIP ${item.id} (already downloaded)`);
      continue;
    }

    const webpPath = join(THUMB_DIR, `${item.id}.webp`);
    if (existsSync(webpPath)) {
      console.log(`  SKIP ${item.id} (webp exists)`);
      continue;
    }

    if (!item.thumb) {
      console.log(`  SKIP ${item.id} (no thumbnail URL)`);
      continue;
    }

    const ext = item.thumb.split('.').pop();
    const origPath = join(THUMB_DIR, `${item.id}.${ext}`);

    process.stdout.write(`  ${item.id}... `);
    try {
      await download(item.thumb, origPath);
      const ok = toWebP(origPath, webpPath);
      console.log(ok ? 'OK' : 'conversion failed');
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
    await sleep(300);
  }

  // ── Step 5: Download detail images ────────────────────────────────
  console.log('\n--- Step 4: Downloading detail images ---\n');

  for (const item of allItems) {
    // Note: don't skip detail images for SKIP_IDS - only thumbnails are skipped
    if (!item.detailImages || item.detailImages.length === 0) {
      continue;
    }

    const detailDir = join(DETAIL_DIR, item.id);
    mkdirSync(detailDir, { recursive: true });

    // Limit to max 10 detail images per project to be reasonable
    const imagesToDownload = item.detailImages.slice(0, 10);

    for (let i = 0; i < imagesToDownload.length; i++) {
      const imgUrl = imagesToDownload[i];
      const imgId = `${item.id}_${String(i + 1).padStart(2, '0')}`;
      const webpPath = join(detailDir, `${imgId}.webp`);

      if (existsSync(webpPath)) {
        continue;
      }

      const ext = imgUrl.split('.').pop().split('?')[0] || 'jpg';
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

  // ── Step 6: Generate portfolio-data.json ──────────────────────────
  console.log('\n--- Step 5: Generating portfolio-data.json ---\n');

  const portfolio = {
    residential: [],
    commercial: []
  };

  for (const item of allItems) {
    const detailImagePaths = [];
    const maxImages = Math.min(item.detailImages.length, 10);
    for (let i = 0; i < maxImages; i++) {
      const imgId = `${item.id}_${String(i + 1).padStart(2, '0')}`;
      detailImagePaths.push(`assets/portfolio/detail/${item.id}/${imgId}.webp`);
    }

    const entry = {
      id: item.id,
      title: item.title,
      region: item.region,
      type: item.type,
      area: item.area,
      duration: item.duration,
      cost: item.cost,
      thumbnail: `assets/portfolio/thumbnails/${item.id}.webp`,
      detailImages: detailImagePaths
    };

    if (item.category === 'residential') {
      portfolio.residential.push(entry);
    } else {
      portfolio.commercial.push(entry);
    }
  }

  writeFileSync(DATA_FILE, JSON.stringify(portfolio, null, 2), 'utf8');
  console.log(`  Written to ${DATA_FILE}`);
  console.log(`  Residential: ${portfolio.residential.length} items`);
  console.log(`  Commercial: ${portfolio.commercial.length} items`);
  console.log('\nDone!');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
