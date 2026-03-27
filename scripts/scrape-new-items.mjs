/**
 * Scrape new portfolio items from tovdesign.imweb.me
 * Extracts: basic info (region, type, area, duration, cost) + detail image CDN URLs
 */
import https from 'https';
import http from 'http';
import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';

// New residential items (R066-R081) - idx values from page 5-6
const newResidential = [
  { id: 'r066', idx: '7168085', board: 'house', info: '서울시송파구|파인타운아파트|모던' },
  { id: 'r067', idx: '7167997', board: 'house', info: '경기도 용인시 기흥구|죽전아리에띠캐슬|내추럴' },
  { id: 'r068', idx: '7167845', board: 'house', info: '경기도 용인시 기흥구|풍림 아파트|모던' },
  { id: 'r069', idx: '7167724', board: 'house', info: '서울시동대문구|아파트|모던' },
  { id: 'r070', idx: '7167615', board: 'house', info: '경기도 양주시|아파트|블랙&화이트' },
  { id: 'r071', idx: '7167532', board: 'house', info: '서울시 관악구 신림동|아파트|블랙&화이트' },
  { id: 'r072', idx: '7167442', board: 'house', info: '경기도 고양시 일산동구|단독주택|모던' },
  { id: 'r073', idx: '7167250', board: 'house', info: '서울시송파구|헬리오시티 아파트|그레이톤' },
  { id: 'r074', idx: '7167183', board: 'house', info: '은평뉴타운|아파트|심플모던' },
  { id: 'r075', idx: '7167043', board: 'house', info: '서울시 은평구불광동|빌라|블랙&화이트' },
  { id: 'r076', idx: '7166909', board: 'house', info: '서울시 강북구|미아동 경남아파트|화이트/그레이' },
  { id: 'r077', idx: '7166774', board: 'house', info: '서울시 노원구 공릉동|빌라|내추럴컨셉' },
  { id: 'r078', idx: '7166463', board: 'house', info: '경기도 고양시 덕양구 고양동|아파트|모던' },
  { id: 'r079', idx: '7166175', board: 'house', info: '고양시 일산 서구|아파트|화이트톤' },
  { id: 'r080', idx: '7166115', board: 'house', info: '서울시 구로구|빌라|모던' },
  { id: 'r081', idx: '7166010', board: 'house', info: '서울시 서대문구|빌라|모던' },
];

// New + old-format commercial items (C012-C025)
const newCommercial = [
  { id: 'c012', idx: '16405043', board: 'commerce', info: '(구형)' },
  { id: 'c013', idx: '16405018', board: 'commerce', info: '(구형)' },
  { id: 'c014', idx: '16405002', board: 'commerce', info: '(구형)' },
  { id: 'c015', idx: '16404773', board: 'commerce', info: '(구형)' },
  { id: 'c016', idx: '16404718', board: 'commerce', info: '(구형)' },
  { id: 'c017', idx: '16404688', board: 'commerce', info: '(구형)' },
  { id: 'c018', idx: '16404662', board: 'commerce', info: '(구형)' },
  { id: 'c019', idx: '16404629', board: 'commerce', info: '(구형)' },
  { id: 'c020', idx: '16404582', board: 'commerce', info: '(구형)' },
  { id: 'c021', idx: '16404560', board: 'commerce', info: '(구형)' },
  { id: 'c022', idx: '15333124', board: 'commerce', info: '서울 노원구 상계동|국어학원|화이트&오크' },
  { id: 'c023', idx: '15177003', board: 'commerce', info: '경기도 양평군 지평면|애견호텔 + 주거공간|4층건물_120평' },
  { id: 'c024', idx: '14625334', board: 'commerce', info: '서울 광진구 군자동|상가(반영구 뷰티샵)' },
  { id: 'c025', idx: '13776532', board: 'commerce', info: '서울 강남구 도곡동|상가(사무실 공간)' },
];

const allItems = [...newResidential, ...newCommercial];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const handler = (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        fetchPage(redirectUrl).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    };
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, handler).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function scrapeDetail(item) {
  const url = `https://tovdesign.imweb.me/${item.board}/?q=YToxOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjt9&bmode=view&idx=${item.idx}&t=board`;

  console.log(`  Fetching ${item.id} (idx=${item.idx})...`);
  const html = await fetchPage(url);
  const $ = load(html);

  // Extract basic info from text
  const bodyText = $('body').text().replace(/\s+/g, ' ');

  // Parse structured info block
  const regionMatch = bodyText.match(/지역\s*[:|l]\s*(.+?)(?:공간|면적|기간|예산|총액)/);
  const typeMatch = bodyText.match(/공간\s*[:|l]\s*(.+?)(?:면적|기간|예산|총액)/);
  const areaMatch = bodyText.match(/면적\s*[:|l]\s*(.+?)(?:기간|예산|총액)/);
  const durationMatch = bodyText.match(/기간\s*[:|l]\s*(.+?)(?:예산|총액|2\.|3\.)/);
  const costMatch = bodyText.match(/(?:예산|총액)\s*[:|l]\s*(.+?)(?:\d\.|\s{2}|시공|공간)/);

  // Extract page title for display name
  const pageTitle = $('title').text().trim();
  const titleBracketMatch = pageTitle.match(/\[(.+?)\]/);
  const displayTitle = titleBracketMatch ? titleBracketMatch[1] : item.info;

  // Extract all CDN image URLs from content
  // Key insight: imweb uses data-src for lazy-loaded content images
  // data-src format: https://cdn.imweb.me/upload/S.../hash.ext
  // src format: https://cdn.imweb.me/thumbnail/date/hash.ext
  const imageUrls = [];

  // Primary: data-src attributes (content images)
  $('img[data-src]').each((i, el) => {
    const dataSrc = $(el).attr('data-src') || '';
    if (dataSrc.includes('cdn.imweb.me')) {
      imageUrls.push(dataSrc);
    }
  });

  // Fallback: src attributes with upload path
  $('img').each((i, el) => {
    const src = $(el).attr('src') || '';
    if (src.includes('cdn.imweb.me/upload/')) {
      imageUrls.push(src);
    }
  });

  // Also check for images in style attributes (background-image)
  $('[style*="background-image"]').each((i, el) => {
    const style = $(el).attr('style') || '';
    const urlMatch = style.match(/url\(['"]?(https:\/\/cdn\.imweb\.me\/.+?)['"]?\)/);
    if (urlMatch) imageUrls.push(urlMatch[1]);
  });

  // Known non-content hashes to exclude
  const excludeHashes = ['02dee919b7459', '1693dd50a09ca', '64d3f654e515c', 'default_profile'];
  const uniqueUrls = [...new Set(imageUrls)]
    .filter(url => !excludeHashes.some(h => url.includes(h)));

  const result = {
    id: item.id,
    idx: item.idx,
    displayTitle: displayTitle,
    region: regionMatch ? regionMatch[1].trim() : '',
    type: typeMatch ? typeMatch[1].trim() : '',
    area: areaMatch ? areaMatch[1].trim() : '',
    duration: durationMatch ? durationMatch[1].trim() : '',
    cost: costMatch ? costMatch[1].trim() : '',
    thumbnailUrl: uniqueUrls[0] || '',
    detailImageUrls: uniqueUrls,
    imageCount: uniqueUrls.length,
    pageTitle: pageTitle.substring(0, 100),
  };

  return result;
}

async function main() {
  console.log(`Scraping ${allItems.length} items...`);
  const results = [];

  for (const item of allItems) {
    try {
      const data = await scrapeDetail(item);
      results.push(data);
      console.log(`  ✅ ${data.id}: ${data.displayTitle} | ${data.imageCount} images`);
    } catch (err) {
      console.error(`  ❌ ${item.id}: ${err.message}`);
      results.push({ id: item.id, idx: item.idx, error: err.message });
    }
    await sleep(500); // Rate limit
  }

  // Save results
  const outPath = path.join(process.cwd(), 'scraped-new-items.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nSaved ${results.length} items to ${outPath}`);

  // Summary
  const success = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);
  console.log(`Success: ${success.length}, Failed: ${failed.length}`);
  if (failed.length) console.log('Failed:', failed.map(f => f.id).join(', '));
}

main().catch(console.error);
