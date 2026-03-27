import { readFileSync, writeFileSync } from 'fs';
import https from 'https';
import { load } from 'cheerio';

const BASE = 'https://tov2024.imweb.me';
const DATA_FILE = 'F:/tov2026/portfolio-data.json';
const DELAY_MS = 500;

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

// Known idx values from scraping (we need to map IDs to idx)
// We'll re-scrape listings to get idx values
function parseListPage(html) {
  const $ = load(html);
  const items = [];
  $('._post_item_wrap').each((i, el) => {
    const $el = $(el);
    const titleText = $el.find('.title').text().trim().replace(/\s+/g, ' ');
    const bracketMatch = titleText.match(/\[(.+)\]/);
    const title = bracketMatch ? bracketMatch[1] : titleText;
    const href = $el.find('a._fade_link').attr('href') || '';
    const idxMatch = href.match(/idx=(\d+)/);
    const idx = idxMatch ? idxMatch[1] : '';
    if (title && idx) items.push({ title, idx });
  });
  return items;
}

async function main() {
  const portfolio = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  const allItems = [...portfolio.residential, ...portfolio.commercial];

  // Re-scrape listing pages to get idx values
  console.log('Scraping listing pages for idx values...');
  const idxMap = {};

  // Residential pages
  for (let page = 1; page <= 5; page++) {
    const url = page === 1
      ? `${BASE}/house`
      : `${BASE}/house/?q=YToxOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjt9&page=${page}`;
    const html = await fetchPage(url);
    const items = parseListPage(html);
    items.forEach((item, i) => {
      const globalIdx = (page - 1) * 16 + i;
      const id = `r${String(globalIdx + 1).padStart(3, '0')}`;
      idxMap[id] = item.idx;
    });
    await sleep(DELAY_MS);
  }

  // Commerce page
  const cHtml = await fetchPage(`${BASE}/commerce`);
  const cItems = parseListPage(cHtml);
  cItems.forEach((item, i) => {
    const id = `c${String(i + 1).padStart(3, '0')}`;
    idxMap[id] = item.idx;
  });

  console.log(`Got ${Object.keys(idxMap).length} idx values`);

  // Now re-scrape detail pages for cost/duration
  let updated = 0;
  for (const item of allItems) {
    const idx = idxMap[item.id];
    if (!idx) continue;

    const section = item.id.startsWith('r') ? 'house' : 'commerce';
    const detailUrl = `${BASE}/${section}/?bmode=view&idx=${idx}&t=board`;

    process.stdout.write(`  ${item.id}... `);
    try {
      const html = await fetchPage(detailUrl);
      const $ = load(html);
      const bodyText = $('body').text();

      // Parse cost with improved regex
      const costMatch = bodyText.match(/총액\s*[l|ㅣ|\|]\s*([\d억\s,만원]+)/);
      if (costMatch) {
        const newCost = costMatch[1].trim();
        if (newCost !== item.cost) {
          item.cost = newCost;
          updated++;
        }
      }

      // Also update duration if missing
      if (!item.duration) {
        const durationMatch = bodyText.match(/기간\s*[l|ㅣ|\|]\s*(.+?)(?:\s*총액|\s*\n)/);
        if (durationMatch) {
          item.duration = durationMatch[1].trim();
        }
      }

      // Also update region/type/area if missing
      if (!item.region || !item.type || !item.area) {
        const regionMatch = bodyText.match(/지역\s*[l|ㅣ|\|]\s*(.+?)(?:\s*공간|\s*\n)/);
        const typeMatch = bodyText.match(/공간\s*[l|ㅣ|\|]\s*(.+?)(?:\s*면적|\s*\n)/);
        const areaMatch = bodyText.match(/면적\s*[l|ㅣ|\|]\s*(.+?)(?:\s*기간|\s*\n)/);
        if (regionMatch && !item.region) item.region = regionMatch[1].trim();
        if (typeMatch && !item.type) item.type = typeMatch[1].trim();
        if (areaMatch && !item.area) item.area = areaMatch[1].trim();
      }

      console.log(`cost=${item.cost}, duration=${item.duration}`);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  writeFileSync(DATA_FILE, JSON.stringify(portfolio, null, 2), 'utf8');
  console.log(`\nUpdated ${updated} cost values. Saved to ${DATA_FILE}`);
}

main().catch(e => { console.error(e); process.exit(1); });
